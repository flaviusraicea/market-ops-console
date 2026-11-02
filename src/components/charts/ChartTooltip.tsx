"use client";

import { useTooltip } from "@visx/tooltip";
import { useCallback, useEffect } from "react";

export type TooltipContent = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

/** Tooltip state for one chart. Positions are in the coordinates of the chart's relative wrapper. */
export function useChartTooltip() {
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } =
    useTooltip<TooltipContent>();

  const show = useCallback(
    (content: TooltipContent, left: number, top: number) =>
      showTooltip({ tooltipData: content, tooltipLeft: left, tooltipTop: top }),
    [showTooltip],
  );

  useEffect(() => {
    if (!tooltipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideTooltip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tooltipOpen, hideTooltip]);

  return {
    open: tooltipOpen,
    content: tooltipData,
    left: tooltipLeft ?? 0,
    top: tooltipTop ?? 0,
    show,
    hide: hideTooltip,
  };
}

/** Design-system 6.8: surface box, title in ink, rows with right-aligned values. Sits above the point with a caret. */
export function ChartTooltip({
  title,
  rows,
  left,
  top,
}: TooltipContent & { left: number; top: number }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-control border border-border bg-surface px-2.5 py-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] shadow-popover"
      style={{ left, top: top - 8 }}
    >
      <p className="font-semibold text-ink">{title}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-ink-2">{row.label}</dt>
            <dd className="text-right text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      <span
        aria-hidden
        className="absolute top-full left-1/2 -mt-[4px] size-[8px] -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface"
      />
    </div>
  );
}
