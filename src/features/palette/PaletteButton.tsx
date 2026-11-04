"use client";

import { ICON_STROKE, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePalette } from "./PaletteProvider";
import { useShortcutLabel } from "./useShortcutLabel";

/** The only visible way in besides the keyboard: it lives in the assistant panel header, not the page header. */
export function PaletteButton({ side }: { side?: "left" }) {
  const { openPalette } = usePalette();
  const shortcut = useShortcutLabel();
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
        <TooltipContent {...(side ? { side } : {})}>{shortcut}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
