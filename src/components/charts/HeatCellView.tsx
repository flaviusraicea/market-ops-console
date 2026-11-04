"use client";

import { memo, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";

import { TriangleAlert } from "@/components/icons";
import { formatPeriodAbbr } from "@/lib/format";
import type { HeatCell } from "./HeatMap";
import { attainmentDiverging } from "./scales";

/** What a cell calls. One stable object per grid, so a cell's props change only when its own data does. */
export type CellHandlers = {
  select: (row: number, col: number) => void;
  keyDown: (e: KeyboardEvent<HTMLDivElement>, row: number, col: number) => void;
  mouseMove: (e: MouseEvent<HTMLDivElement>, row: number, col: number) => void;
  mouseLeave: () => void;
  focus: (e: FocusEvent<HTMLDivElement>, row: number, col: number) => void;
  blur: () => void;
  register: (row: number, col: number, el: HTMLDivElement | null) => void;
};

/** One of the 312 cells. Memoised: moving the tooltip or the keyboard position redraws two cells, not all. */
export const HeatCellView = memo(function HeatCellView({
  rowId,
  rowName,
  cell,
  ri,
  ci,
  isSelected,
  isTabStop,
  h,
}: {
  rowId: string;
  rowName: string;
  cell: HeatCell;
  ri: number;
  ci: number;
  isSelected: boolean;
  isTabStop: boolean;
  h: CellHandlers;
}) {
  return (
    <div
      ref={(el) => h.register(ri, ci, el)}
      role="gridcell"
      aria-colindex={ci + 2}
      aria-selected={isSelected}
      tabIndex={isTabStop ? 0 : -1}
      aria-label={`${rowName}, ${formatPeriodAbbr(cell.period)}, ${cell.display} of forecast${cell.anomaly ? ", anomaly" : ""}${cell.differs ? `, differs from source: ${cell.differs}` : ""}`}
      data-period={cell.period}
      data-market={rowId}
      className="tween-fill relative h-6 cursor-pointer rounded-mark"
      style={{
        background: `var(${attainmentDiverging(cell.value)})`,
        ...(isSelected ? { boxShadow: "inset 0 0 0 2px var(--accent)" } : {}),
      }}
      onClick={() => h.select(ri, ci)}
      onKeyDown={(e) => h.keyDown(e, ri, ci)}
      onMouseMove={(e) => h.mouseMove(e, ri, ci)}
      onMouseLeave={h.mouseLeave}
      onFocus={(e) => h.focus(e, ri, ci)}
      onBlur={h.blur}
    >
      {cell.differs ? (
        // Decorative: the cell's name and its tooltip carry the note. A bottom-left tick, so it never meets the anomaly mark.
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 left-0.5 size-1.5 rounded-full border border-ink bg-transparent"
        />
      ) : null}
      {cell.anomaly ? (
        // The mark is decorative: the cell's name already says anomaly. A surface halo keeps it legible on any fill.
        <TriangleAlert
          aria-hidden
          className="pointer-events-none absolute top-0.5 right-0.5 size-2.5 text-ink"
          strokeWidth={2.5}
          style={{
            filter: "drop-shadow(0 0 1px var(--surface)) drop-shadow(0 0 1px var(--surface))",
          }}
        />
      ) : null}
    </div>
  );
});
