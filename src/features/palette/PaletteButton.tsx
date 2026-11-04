"use client";

import { ICON_STROKE, Search } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePalette } from "./PaletteProvider";
import { useShortcutLabel } from "./useShortcutLabel";

/**
 * The visible way into the palette besides the keyboard. From 1024 px it sits in the page header ("Search · ⌘K");
 * below that the phone bar and sheet keep their own copy, unchanged, because the mobile layout is frozen.
 */
export function PaletteButton({ placement = "header" }: { placement?: "header" | "phone" }) {
  const { openPalette } = usePalette();
  const shortcut = useShortcutLabel();
  const header = placement === "header";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={header ? "Search and commands" : "Open command palette"}
            aria-keyshortcuts="Control+K Meta+K"
            onClick={openPalette}
          >
            <Search
              aria-hidden
              className={header ? "size-4" : "size-[18px]"}
              strokeWidth={ICON_STROKE}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {header ? (shortcut ? `Search · ${shortcut}` : "Search") : shortcut}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
