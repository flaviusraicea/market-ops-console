"use client";

import { useRef, useState } from "react";

import { Info, ICON_STROKE } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A small info button whose tooltip opens on hover and keyboard focus, and toggles on click or tap.
 * Radix tooltips ignore touch, so the open state is held here and the click drives it.
 */
export function InfoTip({ label, children }: { label: string; children: string }) {
  const [open, setOpen] = useState(false);
  const clicking = useRef(false);
  const openedAt = useRef(0);
  const pointer = useRef<number | null>(null);
  return (
    <TooltipProvider>
      <Tooltip
        open={open}
        onOpenChange={(next) => {
          // Radix closes the tooltip as part of every click; the toggle below owns that case.
          if (!next && (clicking.current || pointer.current !== null)) {
            clicking.current = false;
            return;
          }
          if (next) openedAt.current = performance.now();
          setOpen(next);
        }}
      >
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            onPointerDown={() => {
              pointer.current = performance.now();
            }}
            onClick={() => {
              clicking.current = true;
              // A tap focuses the button, which opens the tooltip between pointerdown and click.
              const openedByThisTap =
                pointer.current !== null && openedAt.current >= pointer.current;
              pointer.current = null;
              setOpen((o) => (openedByThisTap ? true : !o));
            }}
            className="inline-flex size-5 items-center justify-center rounded-control text-ink-muted hover:text-ink"
          >
            <Info aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
