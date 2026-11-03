"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/components/cn";
import { formatMoneyCompact, formatPct, formatPeriodAbbr, formatPeriodShort } from "@/lib/format";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { attainmentDiverging } from "./scales";

export type HeatCell = {
  period: string;
  /** Attainment, percent with one decimal. */
  value: number;
  display: string;
  actual: number;
  forecast: number;
};
export type HeatRow = { id: string; name: string; cells: readonly HeatCell[] };

type HeatMapProps = {
  rows: readonly HeatRow[];
  periods: readonly string[];
  /** The cell shown as selected, usually (ctx.market, ctx.period). */
  selected?: { market: string; period: string } | undefined;
  label: string;
  onCell: (market: string, period: string) => void;
};

const NAME_COL = "6.5rem";
const PAGE = 6;

/**
 * Markets by month, coloured by forecast attainment (ADR 0008). A roving-tabindex grid: one tab stop,
 * arrows move, PageUp and PageDown jump six months, Enter selects the cell.
 */
export function HeatMap({ rows, periods, selected, label, onCell }: HeatMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const tip = useChartTooltip();
  const nCols = periods.length;

  const [pos, setPos] = useState<{ r: number; c: number }>({
    r: Math.max(
      rows.findIndex((row) => row.id === selected?.market),
      0,
    ),
    c: Math.max(periods.indexOf(selected?.period ?? ""), 0),
  });
  const r = Math.min(pos.r, rows.length - 1);
  const c = Math.min(pos.c, nCols - 1);

  const key = (row: number, col: number) => `${row}:${col}`;

  function reveal(row: number, col: number, el: Element) {
    const rowData = rows[row];
    const cell = rowData?.cells[col];
    const wrap = wrapRef.current?.getBoundingClientRect();
    if (!rowData || !cell || !wrap) return;
    const box = el.getBoundingClientRect();
    tip.show(
      {
        title: `${rowData.name} · ${formatPeriodAbbr(cell.period)}`,
        rows: [
          { label: "Actual", value: formatMoneyCompact(cell.actual) },
          { label: "Forecast", value: formatMoneyCompact(cell.forecast) },
          { label: "Attainment", value: formatPct(cell.value, { sign: false }) },
        ],
      },
      box.left - wrap.left + box.width / 2,
      box.top - wrap.top,
    );
  }

  function move(row: number, col: number) {
    const nr = Math.min(Math.max(row, 0), rows.length - 1);
    const nc = Math.min(Math.max(col, 0), nCols - 1);
    setPos({ r: nr, c: nc });
    cellRefs.current.get(key(nr, nc))?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>, row: number, col: number) {
    const handled = (next: [number, number]) => {
      e.preventDefault();
      move(next[0], next[1]);
    };
    switch (e.key) {
      case "ArrowRight":
        return handled([row, col + 1]);
      case "ArrowLeft":
        return handled([row, col - 1]);
      case "ArrowDown":
        return handled([row + 1, col]);
      case "ArrowUp":
        return handled([row - 1, col]);
      case "Home":
        return handled([e.ctrlKey ? 0 : row, 0]);
      case "End":
        return handled([e.ctrlKey ? rows.length - 1 : row, nCols - 1]);
      case "PageDown":
        return handled([row, col + PAGE]);
      case "PageUp":
        return handled([row, col - PAGE]);
      case "Enter":
      case " ": {
        e.preventDefault();
        const rowData = rows[row];
        const cell = rowData?.cells[col];
        if (rowData && cell) onCell(rowData.id, cell.period);
      }
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="overflow-x-auto">
        <div
          role="grid"
          aria-label={label}
          aria-rowcount={rows.length + 1}
          aria-colcount={nCols + 1}
          className="grid min-w-[26rem] gap-[2px] bg-surface"
          style={{ gridTemplateColumns: `${NAME_COL} repeat(${nCols}, minmax(0, 1fr))` }}
        >
          <div role="row" aria-rowindex={1} className="contents">
            <div
              role="columnheader"
              aria-colindex={1}
              className="sticky left-0 z-[1] bg-surface pr-2 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold text-ink-muted uppercase"
            >
              Market
            </div>
            {periods.map((p, i) => (
              <div
                key={p}
                role="columnheader"
                aria-colindex={i + 2}
                className="relative h-4 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted"
              >
                <span className="sr-only">{formatPeriodAbbr(p)}</span>
                {i % 3 === 0 ? (
                  <span aria-hidden className="absolute bottom-0 left-0 whitespace-nowrap">
                    {formatPeriodShort(p)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {rows.map((row, ri) => {
            const rowSelected = selected?.market === row.id;
            return (
              <div key={row.id} role="row" aria-rowindex={ri + 2} className="contents">
                <div
                  role="rowheader"
                  aria-colindex={1}
                  className={cn(
                    "sticky left-0 z-[1] truncate bg-surface pr-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
                    "flex h-6 items-center",
                    rowSelected ? "font-semibold text-ink" : "font-medium text-ink-2",
                  )}
                >
                  {row.name}
                </div>
                {row.cells.map((cell, ci) => {
                  const isSelected = rowSelected && selected?.period === cell.period;
                  return (
                    <div
                      key={cell.period}
                      ref={(el) => {
                        if (el) cellRefs.current.set(key(ri, ci), el);
                        else cellRefs.current.delete(key(ri, ci));
                      }}
                      role="gridcell"
                      aria-colindex={ci + 2}
                      aria-selected={isSelected}
                      tabIndex={ri === r && ci === c ? 0 : -1}
                      aria-label={`${row.name}, ${formatPeriodAbbr(cell.period)}, ${cell.display} of forecast`}
                      data-period={cell.period}
                      data-market={row.id}
                      className={cn("h-6 cursor-pointer rounded-[2px]")}
                      style={{
                        background: `var(${attainmentDiverging(cell.value)})`,
                        ...(isSelected ? { boxShadow: "inset 0 0 0 2px var(--accent)" } : {}),
                      }}
                      onClick={() => onCell(row.id, cell.period)}
                      onKeyDown={(e) => onKeyDown(e, ri, ci)}
                      onMouseEnter={(e: MouseEvent<HTMLDivElement>) =>
                        reveal(ri, ci, e.currentTarget)
                      }
                      onMouseLeave={tip.hide}
                      onFocus={(e: FocusEvent<HTMLDivElement>) => {
                        setPos({ r: ri, c: ci });
                        reveal(ri, ci, e.currentTarget);
                      }}
                      onBlur={tip.hide}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {tip.open && tip.content ? (
        <ChartTooltip {...tip.content} left={tip.left} top={tip.top} />
      ) : null}
    </div>
  );
}

/** Markets by periods with the same numbers as the colours. */
export function HeatMapTable({
  caption,
  rows,
  periods,
}: {
  caption: string;
  rows: readonly HeatRow[];
  periods: readonly string[];
}) {
  return (
    <Table scrollLabel={`${caption}, scrollable`}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="sticky left-0 bg-surface-2">
            Market
          </TableHead>
          {periods.map((p) => (
            <TableHead key={p} scope="col" className="text-right">
              {formatPeriodShort(p)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableHead
              scope="row"
              className="sticky left-0 bg-surface text-[length:var(--text-body-dense)] font-medium tracking-normal text-ink normal-case"
            >
              {row.name}
            </TableHead>
            {row.cells.map((cell) => (
              <TableCell key={cell.period} className="text-right num">
                {cell.display}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
