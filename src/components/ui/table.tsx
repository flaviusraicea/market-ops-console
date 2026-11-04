"use client";

import * as React from "react";
import { cn } from "@/components/cn";
import { EYEBROW_CLASS } from "@/components/Eyebrow";

/**
 * `stickyFirst` pins the first column (for a table that scrolls sideways on a phone). `scrollLabel` makes the scrolling
 * container a focusable named region, for tables wider than their card. Cells marked `data-pin="start"` or
 * `data-pin="end"` stay at that edge while the rest scrolls between them (globals.css draws their edge and fade).
 */
function Table({
  className,
  scrollLabel,
  stickyFirst = false,
  ...props
}: React.ComponentProps<"table"> & { scrollLabel?: string; stickyFirst?: boolean }) {
  const { el, attach, edges, update } = useScrollEdges();
  return (
    <div className="relative w-full">
      <div
        ref={attach}
        data-slot="table-container"
        data-overflow={edges.overflow ? "" : undefined}
        data-scroll-start={edges.start ? "" : undefined}
        data-scroll-end={edges.end ? "" : undefined}
        // A table wider than its card always shows a thin scrollbar, and a 24 px fade at each edge that can still
        // scroll.
        className="relative w-full overflow-x-auto [scrollbar-color:var(--border-control)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
        onScroll={update}
        onFocus={(e) => {
          if (el) revealBetweenPins(el, e.target);
        }}
        {...(scrollLabel ? { tabIndex: 0, role: "region", "aria-label": scrollLabel } : {})}
      >
        <table
          data-slot="table"
          className={cn(
            "w-full caption-bottom text-[length:var(--text-body)] leading-[18px]",
            // Where the table is wider than its card, the first column stays in view while the rest scrolls.
            stickyFirst &&
              "[&_tr>:first-child]:sticky [&_tr>:first-child]:left-0 [&_tr>:first-child]:z-[1] [&_tbody_tr>:first-child]:bg-surface [&_tbody_tr:hover>:first-child]:bg-surface-2 [&_tbody_tr[data-state=selected]>:first-child]:bg-accent-soft [&_thead_tr>:first-child]:bg-surface-2",
            className,
          )}
          {...props}
        />
      </div>
      {/* A pinned column draws its own fade beside it; an edge without one fades at the container. */}
      {edges.start && !edges.pinStart ? (
        <span
          aria-hidden
          data-slot="table-fade"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-surface to-transparent"
        />
      ) : null}
      {edges.end && !edges.pinEnd ? (
        <span
          aria-hidden
          data-slot="table-fade"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent"
        />
      ) : null}
    </div>
  );
}

type Edges = {
  overflow: boolean;
  start: boolean;
  end: boolean;
  pinStart: boolean;
  pinEnd: boolean;
};
const NO_EDGES: Edges = {
  overflow: false,
  start: false,
  end: false,
  pinStart: false,
  pinEnd: false,
};

/** Which edges of a horizontally scrolling box still have columns past them; follows resizes and scrolling. */
function useScrollEdges() {
  // A callback ref held in state, so render reads plain values and the observer follows the mounted element.
  const [el, setEl] = React.useState<HTMLDivElement | null>(null);
  const [edges, setEdges] = React.useState<Edges>(NO_EDGES);
  const update = React.useCallback(() => {
    const table = el?.firstElementChild;
    if (!el || !table) return;
    // Measured from the boxes, not scrollLeft: with a stable gutter the scroll range ends short of
    // scrollWidth - clientWidth, because the last columns paint into the gutter.
    const box = el.getBoundingClientRect();
    const t = table.getBoundingClientRect();
    const next: Edges = {
      overflow: t.width > box.width + 1,
      start: t.left < box.left - 1,
      end: t.right > box.right + 1,
      // A pin draws its own fade only where it is pinned (the last column pins from 768 px).
      pinStart: isPinned(el.querySelector('[data-pin="start"]')),
      pinEnd: isPinned(el.querySelector('[data-pin="end"]')),
    };
    setEdges((prev) =>
      (Object.keys(next) as Array<keyof Edges>).every((k) => prev[k] === next[k]) ? prev : next,
    );
  }, [el]);
  React.useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [el, update]);
  return { el, attach: setEl, edges, update };
}

function isPinned(cell: Element | null) {
  return !!cell && getComputedStyle(cell).position === "sticky";
}

/**
 * The browser scrolls a focused cell into the box, but not clear of the pinned columns, which then cover it.
 * Scroll it into the space between them instead. A pinned cell is always in view.
 */
function revealBetweenPins(box: HTMLElement, target: EventTarget) {
  if (!(target instanceof Element) || target === box) return;
  // A focused row spans the whole table, so there is nothing to bring into view.
  const cell = target.closest("td, th");
  if (!cell || isPinned(cell)) return;
  const row = cell.closest("tr");
  const startPin = row?.querySelector('[data-pin="start"]') ?? null;
  const endPin = row?.querySelector('[data-pin="end"]') ?? null;
  const start = startPin && isPinned(startPin) ? startPin.getBoundingClientRect().right : undefined;
  const end = endPin && isPinned(endPin) ? endPin.getBoundingClientRect().left : undefined;
  const boxRect = box.getBoundingClientRect();
  const r = cell.getBoundingClientRect();
  const left = start ?? boxRect.left;
  const right = end ?? boxRect.right;
  if (r.left < left) box.scrollLeft -= left - r.left;
  else if (r.right > right) box.scrollLeft += r.right - right;
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-surface-2 [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-surface-2 font-medium [&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-[var(--row-h)] border-b border-border transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 data-[state=selected]:bg-accent-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--accent),inset_0_1px_0_var(--selected-edge)]",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-[var(--pad-cell-x)] py-[var(--pad-cell-y)] text-left align-middle",
        EYEBROW_CLASS,
        "text-ink-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "num px-[var(--pad-cell-x)] py-[var(--pad-cell-y)] align-middle whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-[length:var(--text-label)] text-ink-muted", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
