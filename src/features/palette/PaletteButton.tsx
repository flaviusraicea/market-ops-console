"use client";

import { ICON_STROKE, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePalette } from "./PaletteProvider";

/** The only visible way in besides the keyboard: it lives in the assistant panel header, not the page header. */
export function PaletteButton() {
  const { openPalette } = usePalette();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open command palette"
            aria-keyshortcuts="Control+K Meta+K"
            onClick={openPalette}
          >
            <Search aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>⌘K / Ctrl+K</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
