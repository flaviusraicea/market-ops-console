"use client";

import * as React from "react";
import { defaultFilter } from "cmdk";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "@/components/cn";
import { DialogDescription, DialogOverlay, DialogTitle } from "@/components/ui/dialog";

export { defaultFilter };

/** A dialog that holds a cmdk palette. 600 px from the top on desktop; a full-height sheet below 1024 px. */
function CommandDialog({
  open,
  onOpenChange,
  title,
  description,
  onCloseAutoFocus,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onCloseAutoFocus: (event: Event) => void;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-slot="command-dialog"
          data-chrome=""
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed top-[104px] left-1/2 z-50 flex w-[600px] max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-sheet layer-overlay text-ink outline-none",
            "max-lg:top-0 max-lg:left-0 max-lg:h-dvh max-lg:w-dvw max-lg:max-w-none max-lg:translate-x-0 max-lg:rounded-none max-lg:border-0",
          )}
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Command } from "cmdk";
export { CommandDialog };
