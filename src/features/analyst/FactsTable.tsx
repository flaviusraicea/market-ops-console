"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState } from "react";

import { cn } from "@/components/cn";
import { ArrowDown, ArrowUp, ICON_STROKE } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatInt, formatMoneyFull, formatPct } from "@/lib/format";
import { SheetSection } from "./Sheet";
import type { FactRowVM, FactsVM } from "./viewModel";

const ROW_H = 32;
const OVERSCAN = 8;

type Column = {
  key: keyof FactRowVM;
  label: string;
  numeric: boolean;
  /** The cell text: formatted for reading. */
  cell: (r: FactRowVM) => string;
  /** The CSV value: the raw number, never the formatted string. */
  csv: (r: FactRowVM) => string | number;
};

const COLUMNS: Column[] = [
  { key: "market", label: "Market", numeric: false, cell: (r) => r.market, csv: (r) => r.market },
  {
    key: "product",
    label: "Product",
    numeric: false,
    cell: (r) => r.product,
    csv: (r) => r.product,
  },
  { key: "period", label: "Period", numeric: false, cell: (r) => r.period, csv: (r) => r.period },
  {
    key: "actual",
    label: "Actual",
    numeric: true,
    cell: (r) => `$${formatMoneyFull(r.actual)}`,
    csv: (r) => r.actual,
  },
  {
    key: "forecast",
    label: "Forecast",
    numeric: true,
    cell: (r) => `$${formatMoneyFull(r.forecast)}`,
    csv: (r) => r.forecast,
  },
  {
    key: "priorYear",
    label: "Prior year",
    numeric: true,
    cell: (r) => `$${formatMoneyFull(r.priorYear)}`,
    csv: (r) => r.priorYear,
  },
  {
    key: "units",
    label: "Units",
    numeric: true,
    cell: (r) => formatInt(r.units),
    csv: (r) => r.units,
  },
  {
    key: "attainment",
    label: "Attainment",
    numeric: true,
    cell: (r) => formatPct(r.attainment, { sign: false }),
    csv: (r) => Math.round(r.attainment * 10) / 10,
  },
];

type Sort = { key: keyof FactRowVM; dir: "asc" | "desc" } | null;

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

export function toCsv(rows: FactRowVM[]): string {
  const head = COLUMNS.map((c) => c.label).join(",");
  const body = rows.map((r) => COLUMNS.map((c) => csvCell(c.csv(r))).join(","));
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

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_H,
    overscan: OVERSCAN,
    initialRect: { width: 0, height: 600 },
  });
  const items = virtualizer.getVirtualItems();
  const padTop = items.length ? (items[0]?.start ?? 0) : 0;
  const padBottom = items.length
    ? virtualizer.getTotalSize() - (items[items.length - 1]?.end ?? 0)
    : 0;
  const caption = `${formatInt(rows.length)} of ${formatInt(facts.total)} facts`;

  const toggleSort = (key: keyof FactRowVM) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );

  async function copy() {
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
      caption={caption}
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
        className="relative h-[600px] overflow-auto rounded-control border border-border"
      >
        <table
          aria-rowcount={rows.length + 1}
          className="w-full text-[length:var(--text-body-dense)] leading-[18px]"
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr aria-rowindex={1}>
              {COLUMNS.map((c) => {
                const active = sort?.key === c.key;
                const Icon = sort?.dir === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn(
                      "sticky top-0 z-[1] h-8 border-b border-border bg-surface-2 px-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2",
                      c.numeric ? "text-right" : "text-left",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-control uppercase hover:text-ink",
                        active && "text-ink",
                      )}
                    >
                      {c.label}
                      {active ? (
                        <Icon aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
                      ) : null}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {padTop > 0 ? (
              <tr aria-hidden style={{ height: padTop }}>
                <td colSpan={COLUMNS.length} />
              </tr>
            ) : null}
            {items.map((item) => {
              const r = rows[item.index];
              if (!r) return null;
              return (
                <tr
                  key={item.key}
                  aria-rowindex={item.index + 2}
                  style={{ height: ROW_H }}
                  className="border-b border-border hover:bg-surface-2"
                >
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3 whitespace-nowrap",
                        c.numeric && "num text-right",
                        c.key === "period" && "font-mono",
                        c.key === "market" && "font-medium text-ink",
                      )}
                    >
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {padBottom > 0 ? (
              <tr aria-hidden style={{ height: padBottom }}>
                <td colSpan={COLUMNS.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>
    </SheetSection>
  );
}
