"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

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
import { ICON_STROKE, TriangleAlert } from "@/components/icons";
import { formatMonthShort, formatPeriodAbbr, formatPeriodShort } from "@/lib/format";
import { PHONE_QUERY } from "@/lib/useMediaQuery";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { HeatCellView, type CellHandlers } from "./HeatCellView";
import { heatCellTooltip } from "./heatMapTooltip";

export type HeatCell = {
  period: string;
  /** Attainment, percent with one decimal. */
  value: number;
  display: string;
  actual: number;
  forecast: number;
  /** Month-on-month change in revenue, percent; undefined for the first month. */
  momPct: number | undefined;
  /** Set on a flagged anomaly month: the source's note. The cell gets a mark and the tooltip a line. */
  anomaly?: string | undefined;
};
export type HeatRow = { id: string; name: string; cells: readonly HeatCell[] };

type HeatMapProps = {
  rows: readonly HeatRow[];
  periods: readonly string[];
  /** The cell shown as selected, usually (ctx.market, ctx.period). */
  selected?: { market: string; period: string } | undefined;
  label: string;
  onCell: (market: string, period: string) => void;
  /**
   * Asks about a cell: the tooltip gains an action and Shift+Enter on a focused cell does the same.
   * `momPct` is the month-on-month change in revenue, undefined for the first month.
   */
  onAsk?: (cell: {
    market: string;
    marketName: string;
    period: string;
    momPct: number | undefined;
  }) => void;
};

const NAME_COL = "6.5rem";
/** The grid's gap between cells, and so between the name column and the first month. */
const CELL_GAP = "2px";
/** Where the first month column starts: past the market names and one gap. A legend under the plot starts here. */
export const HEAT_PLOT_INSET = `calc(${NAME_COL} + ${CELL_GAP})`;
const PAGE = 6;
/** Month label steps, smallest first: every third month, then every sixth, then once a year. */
const LABEL_STEPS = [3, 6, 12] as const;
/** The least room between two month labels. */
const LABEL_GAP = 8;

/**
 * The smallest step at which every month label keeps LABEL_GAP to the next. Labels count back from the latest
 * month; each starts at its column's left edge except the last, which ends at the grid's right edge, so the last
 * pair is the tightest: the one before it starts (step + 1) columns from the end.
 */
export function monthLabelStep(pitch: number, labelWidth: number): number {
  return (
    LABEL_STEPS.find(
      (step) =>
        step * pitch - labelWidth >= LABEL_GAP && (step + 1) * pitch - 2 * labelWidth >= LABEL_GAP,
    ) ?? 12
  );
}

/**
 * Markets by month, coloured by forecast attainment (ADR 0008). A roving-tabindex grid: one tab stop,
 * arrows move, PageUp and PageDown jump six months, Enter selects the cell.
 */
export function HeatMap({ rows, periods, selected, label, onCell, onAsk }: HeatMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const tip = useChartTooltip();
  // The shown cell's bottom edge, so a tooltip that would cover the card header can drop below the cell.
  const [tipBottom, setTipBottom] = useState(0);
  // Where the grid is wider than its card (a phone), it opens at the latest months, the ones that matter.
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
  const shown = useRef({ row: 0, col: 0 });
  const nCols = periods.length;

  // The label step follows the grid's own width, which the docked assistant narrows: measured from a month
  // column and the widest label, so it holds for any font or locale. Every third month until measured.
  const headerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(LABEL_STEPS[0]);
  useEffect(() => {
    const row = headerRef.current;
    const grid = row?.parentElement;
    if (!row || !grid) return;
    const measure = () => {
      // Phones keep every third month: their labels are the month alone, and the grid scrolls sideways.
      if (window.matchMedia(PHONE_QUERY).matches) return setStep(LABEL_STEPS[0]);
      const cols = row.querySelectorAll<HTMLElement>("[data-month]");
      const first = cols[0]?.getBoundingClientRect();
      const second = cols[1]?.getBoundingClientRect();
      if (!first || !second) return;
      let widest = 0;
      for (const label of row.querySelectorAll<HTMLElement>("[data-month-label]"))
        widest = Math.max(widest, label.getBoundingClientRect().width);
      setStep(monthLabelStep(second.left - first.left, widest));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
  }, []);

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

  function askAbout(row: number, col: number) {
    const r = rows[row];
    const cell = r?.cells[col];
    if (!r || !cell || !onAsk) return;
    tip.hide();
    onAsk({ market: r.id, marketName: r.name, period: cell.period, momPct: cell.momPct });
  }

  function reveal(row: number, col: number, el: Element) {
    shown.current = { row, col };
    const r = rows[row];
    const cell = r?.cells[col];
    const wrap = wrapRef.current?.getBoundingClientRect();
    if (!r || !cell || !wrap) return;
    const box = el.getBoundingClientRect();
    setTipBottom(box.bottom - wrap.top);
    tip.show(
      heatCellTooltip(r.name, cell, r.cells[col - 1], onAsk && (() => askAbout(row, col))),
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
        if (e.key === "Enter" && e.shiftKey && onAsk) {
          askAbout(row, col);
          return;
        }
        const r = rows[row];
        const cell = r?.cells[col];
        if (r && cell) {
          tip.hide();
          onCell(r.id, cell.period);
        }
      }
    }
  }

  // The handlers read the latest closures from a ref, so the object cells receive never changes identity.
  const latest = useRef({ onKeyDown, reveal, onCell, tip, rows });
  useEffect(() => {
    latest.current = { onKeyDown, reveal, onCell, tip, rows };
  });
  const handlers = useMemo<CellHandlers>(
    () => ({
      select: (row, col) => {
        const { rows: rs, onCell: select, tip: t } = latest.current;
        const rowData = rs[row];
        const cell = rowData?.cells[col];
        if (!rowData || !cell) return;
        // A drill changes what the cell means: the tooltip goes with it.
        t.hide();
        select(rowData.id, cell.period);
      },
      keyDown: (e, row, col) => latest.current.onKeyDown(e, row, col),
      mouseMove: (e, row, col) => {
        const { tip: t, reveal: show } = latest.current;
        // While the pointer travels up to the tooltip action, the rows above the open tooltip stay quiet.
        if (t.locked() && row < shown.current.row) return;
        if (t.open && shown.current.row === row && shown.current.col === col) return;
        show(row, col, e.currentTarget);
      },
      mouseLeave: () => latest.current.tip.hideSoon(),
      focus: (e, row, col) => {
        setPos({ r: row, c: col });
        latest.current.reveal(row, col, e.currentTarget);
      },
      blur: () => latest.current.tip.hideSoon(),
      register: (row, col, el) => {
        if (el) cellRefs.current.set(`${row}:${col}`, el);
        else cellRefs.current.delete(`${row}:${col}`);
      },
    }),
    [],
  );

  return (
    <div ref={wrapRef} className="relative">
      <div ref={scrollRef} className="overflow-x-auto">
        <div
          role="grid"
          aria-label={label}
          aria-rowcount={rows.length + 1}
          aria-colcount={nCols + 1}
          className="grid min-w-[26rem] gap-[var(--heat-gap)] bg-surface"
          style={
            {
              gridTemplateColumns: `${NAME_COL} repeat(${nCols}, minmax(0, 1fr))`,
              "--heat-gap": CELL_GAP,
            } as CSSProperties
          }
        >
          <div ref={headerRef} role="row" aria-rowindex={1} className="contents">
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
                data-month=""
                className="relative h-4 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted"
              >
                <span className="sr-only">{formatPeriodAbbr(p)}</span>
                {/* Every step-th month counted back from the latest, so the last column is always labelled; its
                    label ends at the grid's right edge instead of running past it. */}
                {(nCols - 1 - i) % step === 0 ? (
                  <span
                    aria-hidden
                    data-month-label=""
                    className={cn(
                      "absolute bottom-0 whitespace-nowrap",
                      i === nCols - 1 ? "right-0" : "left-0",
                    )}
                  >
                    {/* A phone has columns about 20 px wide: the month alone keeps neighbouring labels apart. */}
                    <span className="max-md:hidden">{formatPeriodShort(p)}</span>
                    <span className="md:hidden">{formatMonthShort(p)}</span>
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
                    <HeatCellView
                      key={cell.period}
                      rowId={row.id}
                      rowName={row.name}
                      cell={cell}
                      ri={ri}
                      ci={ci}
                      isSelected={isSelected}
                      isTabStop={ri === r && ci === c}
                      h={handlers}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {tip.open && tip.content ? (
        <ChartTooltip
          {...tip.content}
          left={tip.left}
          top={tip.top}
          bottom={tipBottom}
          onHover={tip.hover}
        />
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
    <Table stickyFirst scrollLabel={`${caption}, scrollable`}>
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
              className="sticky left-0 bg-surface text-[length:var(--text-body)] font-medium tracking-normal text-ink normal-case"
            >
              {row.name}
            </TableHead>
            {row.cells.map((cell) => (
              <TableCell key={cell.period} className="text-right num">
                {cell.display}
                {cell.anomaly ? (
                  <>
                    <TriangleAlert
                      aria-hidden
                      className="ml-1 inline size-3 text-bad-text"
                      strokeWidth={ICON_STROKE}
                    />
                    <span className="sr-only"> anomaly</span>
                  </>
                ) : null}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
