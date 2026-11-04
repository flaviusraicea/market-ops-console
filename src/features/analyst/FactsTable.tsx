"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";
import { TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { formatInt, formatMoneyExact, formatPct, formatPeriodAbbr } from "@/lib/format";
import { FACTS_VIEWPORT_H } from "./factsViewport";
import { SheetSection } from "./Sheet";
import { SortHead, type SortState } from "./SortHead";
import type { FactRowVM, FactsVM } from "./viewModel";

const ROW_H = 32;
const OVERSCAN = 8;
/** The most rows the virtualiser mounts at once: the viewport's rows plus the overscan on both sides. */
const MAX_MOUNTED = Math.ceil(FACTS_VIEWPORT_H / ROW_H) + 1 + 2 * OVERSCAN;

type Column = {
  key: keyof FactRowVM;
  label: string;
  /** Share of the table width. Fixed widths let the browser lay a scrolled row out without re-measuring them all. */
  width: string;
  numeric: boolean;
  /** The cell text, formatted for reading. */
  cell: (r: FactRowVM) => string;
  /** The CSV value when it differs from the cell: the raw number, never the formatted string. */
  csv?: (r: FactRowVM) => string | number;
};

const money = (key: "actual" | "forecast" | "priorYear") => (r: FactRowVM) =>
  formatMoneyExact(r[key]);

const COLUMNS: Column[] = [
  { key: "market", label: "Market", width: "18%", numeric: false, cell: (r) => r.market },
  { key: "product", label: "Product", width: "14%", numeric: false, cell: (r) => r.product },
  {
    key: "period",
    label: "Period",
    width: "11%",
    numeric: false,
    cell: (r) => formatPeriodAbbr(r.period),
    // The copied CSV keeps the sortable ISO month.
    csv: (r) => r.period,
  },
  {
    key: "actual",
    label: "Actual",
    width: "13%",
    numeric: true,
    cell: money("actual"),
    csv: (r) => r.actual,
  },
  {
    key: "forecast",
    label: "Forecast",
    width: "13%",
    numeric: true,
    cell: money("forecast"),
    csv: (r) => r.forecast,
  },
  {
    key: "priorYear",
    label: "Prior year",
    width: "13%",
    numeric: true,
    cell: money("priorYear"),
    csv: (r) => r.priorYear,
  },
  {
    key: "units",
    label: "Units",
    width: "8%",
    numeric: true,
    cell: (r) => formatInt(r.units),
    csv: (r) => r.units,
  },
  {
    key: "attainment",
    label: "Attainment",
    width: "10%",
    numeric: true,
    cell: (r) => formatPct(r.attainment, { sign: false }),
    csv: (r) => r.attainment,
  },
];

type Sort = SortState<keyof FactRowVM> | null;

function sortRows(rows: FactRowVM[], sort: Sort): FactRowVM[] {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  const { key } = sort;
  // Array.prototype.sort is stable, so equal values keep their data.json order.
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    return (
      sign *
      (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)))
    );
  });
}

const csvCell = (v: string | number) =>
  /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);

/** The rows as CSV: a header line, then raw values in column order. */
export function toCsv(rows: FactRowVM[]): string {
  const head = COLUMNS.map((c) => c.label).join(",");
  const body = rows.map((r) => COLUMNS.map((c) => csvCell((c.csv ?? c.cell)(r))).join(","));
  return [head, ...body].join("\n");
}

/**
 * Every source fact for the entity in view, as a semantic table. Only the rows near the viewport are in the
 * DOM; spacer rows hold the scroll height and `aria-rowindex` keeps the full position for screen readers.
 */
export function FactsTable({ facts }: { facts: FactsVM }) {
  const [sort, setSort] = useState<Sort>(null);
  const [status, setStatus] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => sortRows(facts.rows, sort), [facts.rows, sort]);

  // TanStack Virtual returns functions the React Compiler cannot memoise; nothing here relies on that.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: OVERSCAN,
    initialRect: { width: 0, height: FACTS_VIEWPORT_H },
  });
  // Always MAX_MOUNTED rows are in the DOM (the window is pulled up at the end of the list), after one spacer row
  // group whose height makes the table as tall as every row, so the header stays sticky all the way down. Each
  // mounted row is moved to its place with a transform. Nothing in the layout moves as the window advances (the
  // spacer, the row group and the row slots keep their starts; only the transform changes), so a long scroll
  // reports no layout shift, where spacer rows that grew and shrank around the mounted rows did.
  const first = Math.max(
    0,
    Math.min(virtualizer.getVirtualItems()[0]?.index ?? 0, rows.length - MAX_MOUNTED),
  );
  const mounted = rows.slice(first, first + MAX_MOUNTED);
  const spacer = Math.max(0, rows.length - MAX_MOUNTED) * ROW_H;
  const shift = first * ROW_H - spacer;
  const count = `${formatInt(rows.length)} of ${formatInt(facts.total)} facts`;

  // A new sort order starts at the top, so the first rows you see are the ones the sort is about.
  const onSort = (next: NonNullable<Sort>) => {
    setSort(next);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  async function copy() {
    // Clear first so a second copy changes the live region and is announced again.
    setStatus("");
    try {
      await navigator.clipboard.writeText(toCsv(rows));
      setStatus(`Copied ${formatInt(rows.length)} rows`);
    } catch {
      setStatus("Copy failed. Your browser blocked clipboard access.");
    }
  }

  return (
    <SheetSection
      eyebrow="All facts"
      subtitle="Source rows behind every figure"
      caption={`${count} · Source · data.json`}
      actions={
        <Button type="button" variant="ghost" onClick={copy}>
          Copy as CSV
        </Button>
      }
    >
      <div
        ref={scrollRef}
        role="region"
        aria-label="All facts"
        tabIndex={0}
        style={{ height: FACTS_VIEWPORT_H }}
        // Strict containment keeps a scroll's row swap from laying out anything outside this box; the scrollbar
        // is always shown, so the region reads as scrollable before anyone tries it.
        className="relative overflow-auto rounded-control border border-border [contain:strict] [overflow-anchor:none] [scrollbar-color:var(--border-control)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
      >
        {/* A bare table: the Table wrapper's own scroll box would break the sticky header. */}
        <table
          aria-rowcount={rows.length + 1}
          className="w-full min-w-[720px] table-fixed text-[length:var(--text-body)] leading-[18px]"
        >
          <caption className="sr-only">{count}</caption>
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow aria-rowindex={1} className="hover:bg-transparent">
              {COLUMNS.map((c) => (
                <SortHead
                  key={c.key}
                  label={c.label}
                  column={c.key}
                  sort={sort}
                  onSort={onSort}
                  firstDir="asc"
                  align={c.numeric ? "right" : "left"}
                  className="sticky top-0 z-[1] bg-surface-2"
                />
              ))}
            </TableRow>
          </TableHeader>
          {spacer > 0 ? (
            <tbody aria-hidden>
              <tr style={{ height: spacer }}>
                <td colSpan={COLUMNS.length} className="p-0" />
              </tr>
            </tbody>
          ) : null}
          <TableBody>
            {mounted.map((r, i) => {
              const index = first + i;
              return (
                <TableRow
                  key={index}
                  aria-rowindex={index + 2}
                  style={{ height: ROW_H, transform: `translateY(${shift}px)` }}
                >
                  {COLUMNS.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        "truncate",
                        c.numeric && "num text-right",
                        c.key === "period" && "whitespace-nowrap",
                        c.key === "market" && "font-medium text-ink",
                      )}
                    >
                      {c.cell(r)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>
    </SheetSection>
  );
}
