"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { Info, ICON_STROKE } from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const CLOSE_DELAY = 120;

/**
 * An info button whose explanation is a popover: a click, a tap or Enter opens it and keeps it open, Escape or a
 * click elsewhere closes it and focus returns to the button. A mouse hover shows the same content without pinning
 * it, so it reads as a tooltip. Click and touch users get the text too (WCAG 1.4.13, 2.1.1), which a Radix tooltip
 * alone cannot give them.
 *
 * With `text` the trigger is a labelled ghost button (the toolbar's Status rule); without it, a 20 px ⓘ whose hit
 * area is 44 px.
 */
export function InfoTip({
  label,
  children,
  text,
  className,
}: {
  /** The accessible name of the trigger, "About forecast attainment". */
  label: string;
  children: ReactNode;
  /** A visible label: the trigger becomes a ghost button with the ⓘ and this text. */
  text?: string;
  /** For a tip at the edge of the page: a margin keeps its 44 px hit area inside the gutter. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const cancelClose = () => window.clearTimeout(timer.current);
  const closeSoon = () => {
    cancelClose();
    timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };
  useEffect(() => cancelClose, []);

  const hoverOpen = (pointerType: string) => {
    if (pointerType !== "mouse") return;
    cancelClose();
    setOpen(true);
  };
  const hoverClose = (pointerType: string) => {
    if (pointerType === "mouse" && !pinned) closeSoon();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setPinned(false);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-hit=""
          onPointerEnter={(e) => hoverOpen(e.pointerType)}
          onPointerLeave={(e) => hoverClose(e.pointerType)}
          onClick={(e) => {
            // The toggle is ours: a click on a hover-opened tip pins it instead of closing it.
            e.preventDefault();
            cancelClose();
            if (pinned) {
              setPinned(false);
              setOpen(false);
            } else {
              setPinned(true);
              setOpen(true);
            }
          }}
          className={
            text
              ? cn(buttonVariants({ variant: "ghost" }), className)
              : cn(
                  "relative inline-flex size-5 items-center justify-center rounded-control text-ink-muted after:absolute after:-inset-3 hover:text-ink",
                  className,
                )
          }
        >
          <Info aria-hidden className={text ? "size-3.5" : "size-3"} strokeWidth={ICON_STROKE} />
          {text}
        </button>
      </PopoverTrigger>
      <PopoverContent
        // The dialog takes the button's name, so a screen reader announces what it explains.
        aria-label={label}
        // A hover peek must not take focus from the page; a pinned popover does, so Escape and Tab work in it.
        onOpenAutoFocus={(e) => {
          if (!pinned) e.preventDefault();
        }}
        onPointerEnter={cancelClose}
        onPointerLeave={(e) => hoverClose(e.pointerType)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
