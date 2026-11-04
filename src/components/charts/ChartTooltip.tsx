"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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
/** The closest a flipping tooltip comes to the top of the viewport. */
const COLLISION_PADDING = 16;

/** Tooltip state for one chart. Positions are in the coordinates of the chart's relative wrapper. */
export function useChartTooltip() {
  const [state, setState] = useState<{ content: TooltipContent; left: number; top: number } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef(false);
  const grace = useRef(false);

  const cancelHide = useCallback(() => {
    clearTimeout(timer.current);
    grace.current = false;
  }, []);

  const show = useCallback(
    (content: TooltipContent, left: number, top: number) => {
      cancelHide();
      // A tooltip without an action has nothing to hover, so a stale flag must not hold it open.
      if (!content.action) hovering.current = false;
      setState({ content, left, top });
    },
    [cancelHide],
  );

  const hide = useCallback(() => {
    cancelHide();
    hovering.current = false;
    setState(null);
  }, [cancelHide]);

  // `hideSoon` closes after a short grace. The pointer entering the tooltip cancels it, and while the pointer
  // rests on the tooltip it stays open.
  const hideSoon = useCallback(() => {
    cancelHide();
    grace.current = true;
    timer.current = setTimeout(() => {
      grace.current = false;
      if (!hovering.current) setState(null);
    }, HIDE_GRACE_MS);
  }, [cancelHide]);

  const hover = useCallback(
    (inside: boolean) => {
      hovering.current = inside;
      if (inside) cancelHide();
      else hideSoon();
    },
    [cancelHide, hideSoon],
  );

  /** True while the pointer is on the tooltip or travelling to it: other marks must not take it over. */
  const locked = useCallback(() => hovering.current || grace.current, []);

  useEffect(() => cancelHide, [cancelHide]);

  const open = state !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  return {
    open,
    content: state?.content,
    left: state?.left ?? 0,
    top: state?.top ?? 0,
    show,
    hide,
    hideSoon,
    hover,
    locked,
  };
}

/** Design-system 6.8: surface box, title in ink, rows with right-aligned values. Sits above the point with a caret, or below it when there is no room above. */
export function ChartTooltip({
  title,
  rows,
  action,
  left,
  top,
  onHover,
  keepInside = false,
  bottom,
}: TooltipContent & {
  left: number;
  top: number;
  onHover?: (inside: boolean) => void;
  /**
   * For a chart whose anchor is a point and whose frame clips: the box drops below the point, or is held
   * inside the frame. Off for cells, where the anchor is the cell's top edge and below would cover the cell.
   */
  keepInside?: boolean;
  /**
   * For a cell: the mark's bottom edge. The box sits above the mark and drops below it when above would
   * cover what is over the chart (the card header and its View as table button) or come within 16 px of the
   * top of the viewport.
   */
  bottom?: number | undefined;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Near either edge of the chart the box slides inward to stay whole (a phone's plot is narrow); the caret
  // keeps pointing at the mark.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent;
    if (!el || !parent) return;
    const half = el.offsetWidth / 2;
    const lo = half;
    const hi = Math.max(parent.clientWidth - half, lo);
    const shift = Math.min(Math.max(left, lo), hi) - left;
    el.style.setProperty("--caret-shift", `${-shift}px`);
    // The box is placed with a transform, never left/top/margin: the pointer moves it on every hover, and a
    // transform moves it without a layout pass (and without counting as a layout shift).
    // Too near the top for the box to sit above the mark: it drops below the mark when there is more room
    // there, and in a short chart that fits neither side it is held inside the chart rather than clipped.
    if (bottom !== undefined) {
      const h = el.offsetHeight;
      const above = top - 8 - h;
      const flip = above < 0 || parent.getBoundingClientRect().top + above < COLLISION_PADDING;
      el.dataset.flip = String(flip);
      el.style.transform = `translate(${left + shift}px, ${flip ? bottom + 8 + h : top - 8}px)`;
      return;
    }
    if (!keepInside) {
      el.style.transform = `translate(${left + shift}px, ${top - 8}px)`;
      return;
    }
    const h = el.offsetHeight;
    const above = top - 8 - h;
    const below = top + 8;
    const flip = above < 0 && parent.clientHeight - below > top - 8;
    const placed = Math.min(
      Math.max(flip ? below : above, 0),
      Math.max(parent.clientHeight - h, 0),
    );
    el.dataset.flip = String(flip);
    el.style.transform = `translate(${left + shift}px, ${top - 8 + placed - above}px)`;
  });
  return (
    <div
      ref={ref}
      role="tooltip"
      onMouseEnter={action ? () => onHover?.(true) : undefined}
      onMouseLeave={action ? () => onHover?.(false) : undefined}
      className={cn(
        action ? "pointer-events-auto" : "pointer-events-none",
        // The transparent strip under an actionable tooltip bridges the gap to the mark, so the pointer
        // reaches the action without crossing a neighbour.
        action &&
          "after:absolute after:top-full after:left-0 after:h-2 after:w-full data-[flip=true]:after:top-auto data-[flip=true]:after:bottom-full",
        "group/tip fade-in absolute top-0 left-0 z-10 [--fade-dur:var(--dur-press)] min-w-40 -translate-x-1/2 -translate-y-full rounded-control layer-overlay px-2.5 py-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
      )}
      style={{ transform: `translate(${left}px, ${top - 8}px)` }}
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
        className="absolute top-full left-[calc(50%+var(--caret-shift,0px))] -mt-[4px] size-[8px] -translate-x-1/2 rotate-45 border-r border-b border-border bg-surface-overlay group-data-[flip=true]/tip:top-auto group-data-[flip=true]/tip:bottom-full group-data-[flip=true]/tip:-mt-0 group-data-[flip=true]/tip:-mb-[4px] group-data-[flip=true]/tip:border-t group-data-[flip=true]/tip:border-l group-data-[flip=true]/tip:border-r-0 group-data-[flip=true]/tip:border-b-0"
      />
    </div>
  );
}
