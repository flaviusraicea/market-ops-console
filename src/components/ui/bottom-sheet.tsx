"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/components/cn";
import { ICON_STROKE, X } from "@/components/icons";

/** A modal that rises from the bottom edge (phones): scrim, drag-handle decoration, focus trap, Escape and scrim close. */
function BottomSheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="bottom-sheet" {...props} />;
}

function BottomSheetTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

function BottomSheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-slot="bottom-sheet-scrim"
        className="fixed inset-0 z-50 bg-scrim"
      />
      <DialogPrimitive.Content
        data-slot="bottom-sheet-content"
        aria-label={title}
        aria-describedby={undefined}
        tabIndex={-1}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[90dvh] flex-col rounded-t-sheet border-t border-border bg-surface-overlay shadow-overlay outline-none",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <div className="relative flex h-11 shrink-0 items-start justify-center pt-2">
          <span aria-hidden className="h-1 w-9 rounded-pill bg-border" />
          <DialogPrimitive.Close
            aria-label={`Close ${title.toLowerCase()}`}
            data-slot="bottom-sheet-close"
            className="absolute top-0 right-1 inline-flex size-11 items-center justify-center rounded-control text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 hover:text-ink"
          >
            <X aria-hidden className="size-5" strokeWidth={ICON_STROKE} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { BottomSheet, BottomSheetContent, BottomSheetTrigger };
