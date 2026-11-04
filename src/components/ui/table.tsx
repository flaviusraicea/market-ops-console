"use client";

import * as React from "react";
import { cn } from "@/components/cn";
import { EYEBROW_CLASS } from "@/components/Eyebrow";

/** `stickyFirst` pins the first column (for a table that scrolls sideways on a phone). `scrollLabel` makes the scrolling container a focusable named region, for tables wider than their card. */
function Table({
  className,
  scrollLabel,
  stickyFirst = false,
  ...props
}: React.ComponentProps<"table"> & { scrollLabel?: string; stickyFirst?: boolean }) {
  const { attach, more, update } = useOverflowEnd();
  return (
    <div className="relative w-full">
      <div
        ref={attach}
        data-slot="table-container"
        // A table wider than its card always shows a thin scrollbar, and a 24 px fade at the right edge while
        // more columns are out of view (Fable, F04).
        className="relative w-full overflow-x-auto [scrollbar-color:var(--border-control)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin]"
        onScroll={update}
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
      {more ? (
        <span
          aria-hidden
          data-slot="table-fade"
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface to-transparent"
        />
      ) : null}
    </div>
  );
}

/** Whether a horizontally scrolling box has columns past its right edge; follows resizes and scrolling. */
function useOverflowEnd() {
  // A callback ref held in state, so render reads plain values and the observer follows the mounted element.
  const [el, setEl] = React.useState<HTMLDivElement | null>(null);
  const [more, setMore] = React.useState(false);
  const update = React.useCallback(() => {
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, [el]);
  React.useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [el, update]);
  return { attach: setEl, more, update };
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
