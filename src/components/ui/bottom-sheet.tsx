"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/components/cn";

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
        className="fixed inset-0 z-50 bg-ink/[.32]"
      />
      <DialogPrimitive.Content
        data-slot="bottom-sheet-content"
        aria-label={title}
        aria-describedby={undefined}
        tabIndex={-1}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex h-[90dvh] flex-col rounded-t-[12px] border-t border-border bg-surface shadow-popover outline-none",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <div aria-hidden className="flex shrink-0 justify-center pt-2">
          <span className="h-1 w-9 rounded-pill bg-border" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { BottomSheet, BottomSheetContent, BottomSheetTrigger };
