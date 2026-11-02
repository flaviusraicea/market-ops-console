"use client";

import * as React from "react";
import { cn } from "@/components/cn";
import { EYEBROW_CLASS } from "@/components/Eyebrow";

/** `scrollLabel` makes the scrolling container a focusable named region, for tables wider than their card. */
function Table({
  className,
  scrollLabel,
  ...props
}: React.ComponentProps<"table"> & { scrollLabel?: string }) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto"
      {...(scrollLabel ? { tabIndex: 0, role: "region", "aria-label": scrollLabel } : {})}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full caption-bottom text-[length:var(--text-body-dense)] leading-[18px]",
          className,
        )}
        {...props}
      />
    </div>
  );
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
        "h-[var(--row-h)] border-b border-border transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 data-[state=selected]:bg-accent-soft data-[state=selected]:shadow-[inset_3px_0_0_var(--accent)]",
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
