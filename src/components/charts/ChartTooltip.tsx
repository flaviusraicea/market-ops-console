"use client";

import { useTooltip } from "@visx/tooltip";
import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/components/cn";
import { Sparkles, ICON_STROKE } from "@/components/icons";
import { Button } from "@/components/ui/button";

/** An action row under the figures, e.g. "Ask about Germany, Mar 2026". The tooltip then takes pointer events. */
export type TooltipAction = { label: string; hint?: string; onActivate: () => void };

export type TooltipContent = {
  title: string;
  rows: Array<{ label: string; value: string }>;
  action?: TooltipAction;
};

/** How long the tooltip waits before closing, so the pointer can travel from the mark to its action. */
const HIDE_GRACE_MS = 150;

/** Tooltip state for one chart. Positions are in the coordinates of the chart's relative wrapper. */
export function useChartTooltip() {
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } =
    useTooltip<TooltipContent>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);

  const cancelHide = useCallback(() => clearTimeout(timer.current), []);

  const show = useCallback(
    (content: TooltipContent, left: number, top: number) => {
      cancelHide();
      showTooltip({ tooltipData: content, tooltipLeft: left, tooltipTop: top });
    },
    [cancelHide, showTooltip],
  );

  const hide = useCallback(() => {
    cancelHide();
    hovering.current = false;
    hideTooltip();
  }, [cancelHide, hideTooltip]);

  // `hideSoon` closes after a short grace. The pointer entering the tooltip cancels it, and while the pointer
  // rests on the tooltip it stays open.
  const hideSoon = useCallback(() => {
    cancelHide();
    timer.current = setTimeout(() => {
      if (!hovering.current) hideTooltip();
    }, HIDE_GRACE_MS);
  }, [cancelHide, hideTooltip]);

  const hover = useCallback(
    (inside: boolean) => {
      hovering.current = inside;
      if (inside) cancelHide();
      else hideSoon();
    },
    [cancelHide, hideSoon],
  );

  useEffect(() => cancelHide, [cancelHide]);

  useEffect(() => {
    if (!tooltipOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tooltipOpen, hide]);

  return {
    open: tooltipOpen,
    content: tooltipData,
    left: tooltipLeft ?? 0,
    top: tooltipTop ?? 0,
    show,
    hide,
    hideSoon,
    hover,
  };
}

/** Design-system 6.8: surface box, title in ink, rows with right-aligned values. Sits above the point with a caret. */
export function ChartTooltip({
  title,
  rows,
  action,
  left,
  top,
  onHover,
}: TooltipContent & { left: number; top: number; onHover?: (inside: boolean) => void }) {
  return (
    <div
      role="tooltip"
      onMouseEnter={action ? () => onHover?.(true) : undefined}
      onMouseLeave={action ? () => onHover?.(false) : undefined}
      className={cn(
        action ? "pointer-events-auto" : "pointer-events-none",
        "absolute z-10 min-w-40 -translate-x-1/2 -translate-y-full rounded-control border border-border bg-surface px-2.5 py-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] shadow-popover",
      )}
      style={{ left, top: top - 8 }}
    >
      <p className="font-semibold text-ink">{title}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-ink-2">{row.label}</dt>
            <dd className="num text-right text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
      {action ? (
        <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
          <Button
            type="button"
            variant="secondary"
            tabIndex={-1}
            onClick={action.onActivate}
            className="h-7 px-2"
          >
            <Sparkles aria-hidden className="size-3 text-ai-label" strokeWidth={ICON_STROKE} />
            {action.label}
          </Button>
          {action.hint ? (
            <kbd className="rounded-control border border-border px-1.5 text-[length:var(--text-caption)] leading-5 text-ink-muted">
              {action.hint}
            </kbd>
          ) : null}
        </div>
      ) : null}
      <span
        aria-hidden
        className="absolute top-full left-1/2 -mt-[4px] size-[8px] -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface"
      />
    </div>
  );
}
