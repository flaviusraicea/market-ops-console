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
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIN_CELL_CLASS, PIN_HEAD_TINTED_CLASS, ScrollTable } from "@/components/ui/scroll-table";
import { cn } from "@/components/cn";
import { ICON_STROKE, TriangleAlert } from "@/components/icons";
import { InfoTip } from "@/components/InfoTip";
import { formatMonthShort, formatPeriodAbbr, formatPeriodShort } from "@/lib/format";
import { PHONE_QUERY } from "@/lib/useMediaQuery";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { HeatCellView, type CellHandlers } from "./HeatCellView";
import { heatCellTooltip } from "./heatMapTooltip";
import { LABEL_STEPS, monthLabels, type LabelAlign, type LabelLayout } from "./heatMapLabels";

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
  /** Set when the series sum differs from the reported figure: the cell gets a mark and the tooltip a line. */
  differs?: string | undefined;
  /** The reported figure on its own, for the cell's accessible name; the tooltip carries both. */
  reported?: string | undefined;
};
export type HeatRow = { id: string; name: string; cells: readonly HeatCell[] };

type HeatMapProps = {
  rows: readonly HeatRow[];
  periods: readonly string[];
  /** The cell shown as selected, usually (ctx.market, ctx.period). */
  selected?: { market: string; period: string } | undefined;
  label: string;
  /** Set when the latest month's cells differ from the reported figures: a warn mark beside that column header. */
  differsNote?: string | undefined;
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
let measureCanvas: HTMLCanvasElement | undefined;
/** Width of the fade at a side that can still scroll, in px (Tailwind `w-6`). */
const FADE = 24;
const PAGE = 6;
/** A scroll this soon after the reader's wheel, pointer, touch or key input is theirs. */
const INTENT_MS = 1000;

/**
 * Markets by month, coloured by forecast attainment (ADR 0008). A roving-tabindex grid: one tab stop,
 * arrows move, PageUp and PageDown jump six months, Enter selects the cell.
 */
export function HeatMap({
  rows,
  periods,
  selected,
  label,
  differsNote,
  onCell,
  onAsk,
}: HeatMapProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, HTMLDivElement>());
  const tip = useChartTooltip();
  // The shown cell's bottom edge, so a tooltip that would cover the card header can drop below the cell.
  const [tipBottom, setTipBottom] = useState(0);
  const shown = useRef({ row: 0, col: 0 });
  const nCols = periods.length;
  const selectedCol = selected ? periods.indexOf(selected.period) : -1;

  // Where the grid is wider than its card (a phone, or the docked assistant at 1024 px), it opens at the latest
  // months, the ones that matter, and a fade marks each side that can still scroll.
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  // The label layout is measured from a month column and the widest label, against the part of the grid in view,
  // so it holds for any font, zoom or panel width. Until measured, every third month from the latest.
  const [layout, setLayout] = useState<(LabelLayout & { phone: boolean }) | null>(null);
  const measureRef = useRef<() => void>(() => {});
  // Whether the grid follows its latest month through resizes (see the measure below).
  const pinnedRef = useRef(true);
  const periodsRef = useRef(periods);
  useLayoutEffect(() => {
    periodsRef.current = periods;
  });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const row = headerRef.current;
    const grid = row?.parentElement;
    if (!el || !row || !grid) return;
    let overflowed = false;
    // The grid stays at its end through every resize (the assistant docking narrows the card over 400 ms) until the
    // reader scrolls it. Only a scroll that follows the reader's own input counts: scroll events arrive a frame
    // late, so the one our own write causes can report "not at the end" mid-resize. Read before the scroll's
    // measure runs, so a reader's scroll is never pulled back to the end.
    let intentAt = -Infinity;
    const intent = () => {
      intentAt = performance.now();
    };
    const INTENT_EVENTS = ["wheel", "pointerdown", "touchstart", "keydown"] as const;
    for (const type of INTENT_EVENTS) el.addEventListener(type, intent, { passive: true });
    const measure = (fromScroll = false) => {
      if (fromScroll && performance.now() - intentAt < INTENT_MS)
        pinnedRef.current = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      const pinned = pinnedRef.current;
      const overflow = el.scrollWidth > el.clientWidth + 1;
      // The grid opens at its end, and again whenever it starts to overflow, as when the assistant docks. It stays
      // at its end through every resize until the reader scrolls away.
      if (overflow && (!overflowed || pinned)) el.scrollLeft = el.scrollWidth;
      overflowed = overflow;
      const max = el.scrollWidth - el.clientWidth;
      const next = { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
      const cols = row.querySelectorAll<HTMLElement>("[data-month]");
      const first = cols[0]?.getBoundingClientRect();
      const second = cols[1]?.getBoundingClientRect();
      if (!first || !second) return;
      // The widest of every month's label, not only those on screen: which months are labelled changes with the
      // scroll and the selection, and "Nov ’25" is wider than "Jun ’25". Text is measured in the label's own font.
      let widest = 0;
      const shownLabel = row.querySelector<HTMLElement>("[data-month-label]");
      for (const label of row.querySelectorAll<HTMLElement>("[data-month-label]"))
        widest = Math.max(widest, label.getBoundingClientRect().width);
      const ctx = shownLabel
        ? (measureCanvas ??= document.createElement("canvas")).getContext("2d")
        : null;
      if (ctx && shownLabel) {
        // The `font` shorthand reads back empty when the label sets numeric variants, so it is built from parts.
        const cs = getComputedStyle(shownLabel);
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        ctx.letterSpacing = cs.letterSpacing === "normal" ? "0px" : cs.letterSpacing;
        for (const p of periodsRef.current)
          widest = Math.max(widest, Math.ceil(ctx.measureText(formatPeriodShort(p)).width));
      }
      // A column under the right-hand fade is not counted as in view. The fade sits at the content edge, inside the
      // padding that keeps the selection and focus rings of edge cells from being clipped.
      const right =
        el.getBoundingClientRect().right -
        parseFloat(getComputedStyle(el).paddingRight) -
        (next.end ? FADE : 0);
      let last = cols.length - 1;
      while (last > 0 && cols[last]!.getBoundingClientRect().right > right + 1) last -= 1;
      const pitch = second.left - first.left;
      const phone = window.matchMedia(PHONE_QUERY).matches;
      const next2 = { pitch, column: first.width, label: widest, last, phone };
      setLayout((prev) =>
        prev &&
        prev.last === last &&
        prev.phone === phone &&
        Math.abs(prev.pitch - pitch) < 0.5 &&
        Math.abs(prev.column - next2.column) < 0.5 &&
        Math.abs(prev.label - widest) < 0.5
          ? prev
          : next2,
      );
    };
    measureRef.current = () => measure(true);
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    ro.observe(grid);
    // The web font can arrive after the first measure and widen the labels without resizing the grid.
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    let live = true;
    void fonts?.ready.then(() => live && measure());
    const onFonts = () => measure();
    fonts?.addEventListener("loadingdone", onFonts);
    return () => {
      live = false;
      for (const type of INTENT_EVENTS) el.removeEventListener(type, intent);
      ro.disconnect();
      fonts?.removeEventListener("loadingdone", onFonts);
    };
  }, []);

  // A selected month outside the visible part of the grid scrolls into view, clear of the sticky market names.
  useEffect(() => {
    const el = scrollRef.current;
    const col =
      selectedCol >= 0 ? headerRef.current?.querySelectorAll("[data-month]")[selectedCol] : null;
    const name = headerRef.current?.firstElementChild;
    if (!el || !col || !name) return;
    const box = el.getBoundingClientRect();
    const pad = getComputedStyle(el);
    const c = col.getBoundingClientRect();
    const left = box.left + parseFloat(pad.paddingLeft) + name.getBoundingClientRect().width;
    const right = box.right - parseFloat(pad.paddingRight);
    const by = c.left < left ? c.left - left : c.right > right ? c.right - right : 0;
    if (Math.abs(by) < 1) return;
    // A selected month to the left of the view takes the grid off its end, so a resize does not scroll it away.
    if (by < 0) pinnedRef.current = false;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: by, behavior: reduce ? "auto" : "smooth" });
  }, [selectedCol]);

  const labels = useMemo<Map<number, LabelAlign>>(() => {
    // Phones keep every third month from the latest: their labels are the month alone, and the grid scrolls.
    if (!layout || layout.phone) {
      const m = new Map<number, LabelAlign>();
      for (let i = nCols - 1; i >= 0; i -= LABEL_STEPS[0])
        m.set(i, i === nCols - 1 ? "end" : "start");
      return m;
    }
    return monthLabels(layout, selectedCol >= 0 ? selectedCol : undefined);
  }, [layout, nCols, selectedCol]);

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
      {differsNote ? (
        // Outside the grid, so the roving tab stop stays one; it sits beside the latest month's label in the column
        // header row. A phone keeps it above the grid, where its every-third-month labels leave no room beside.
        <div className="absolute top-0 right-0 z-[2] max-md:-top-5">
          <InfoTip label="Differs from source: latest month" tone="warn">
            {differsNote}
          </InfoTip>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="-m-2 scroll-p-2 overflow-x-auto p-2 [scrollbar-color:var(--border-control)_transparent] [scrollbar-width:thin]"
        onScroll={() => measureRef.current()}
      >
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
            } as CSSProperties // CSSProperties has no index for custom properties
          }
        >
          <div ref={headerRef} role="row" aria-rowindex={1} className="contents">
            <div
              role="columnheader"
              aria-colindex={1}
              className="sticky left-0 z-[4] mr-2 bg-surface text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold text-ink-muted uppercase"
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
                {/* The last month in view ends at the visible edge instead of running past it. */}
                {labels.has(i) ? (
                  <span
                    aria-hidden
                    data-month-label=""
                    className={cn(
                      "absolute bottom-0 whitespace-nowrap",
                      labels.get(i) === "end" ? "right-0" : "left-0",
                      // Ends 16 px before the edge, leaving room for the warning mark beside the latest month.
                      differsNote && i === nCols - 1 && "md:pr-4",
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
                    "sticky left-0 z-[4] mr-2 truncate bg-surface text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
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
      {edges.start ? (
        <span
          aria-hidden
          data-slot="scroll-fade"
          className="pointer-events-none absolute inset-y-0 z-[5] w-6 bg-gradient-to-r from-surface to-transparent"
          style={{ left: HEAT_PLOT_INSET }}
        />
      ) : null}
      {edges.end ? (
        <span
          aria-hidden
          data-slot="scroll-fade"
          className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-6 bg-gradient-to-l from-surface to-transparent"
        />
      ) : null}
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
    <ScrollTable scrollLabel={`${caption}, scrollable`}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" data-pin="start" className={PIN_HEAD_TINTED_CLASS}>
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
              data-pin="start"
              className={cn(
                PIN_CELL_CLASS,
                "text-[length:var(--text-body)] font-medium tracking-normal text-ink normal-case",
              )}
            >
              {row.name}
            </TableHead>
            {row.cells.map((cell) => (
              <TableCell key={cell.period} className="text-right num">
                {cell.display}
                {cell.differs ? (
                  <span className="sr-only"> Differs from source: {cell.differs}</span>
                ) : null}
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
    </ScrollTable>
  );
}
