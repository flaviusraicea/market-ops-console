"use client";

import { ICON_STROKE, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePalette } from "./PaletteProvider";
import { useShortcutLabel } from "./useShortcutLabel";

/** The visible way into the palette besides the keyboard: a ghost icon button, tooltip "Search · ⌘K". */
export function PaletteButton() {
  const { openPalette } = usePalette();
  const shortcut = useShortcutLabel();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search and commands"
            aria-keyshortcuts="Control+K Meta+K"
            onClick={openPalette}
          >
            <Search aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{shortcut ? `Search · ${shortcut}` : "Search"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
