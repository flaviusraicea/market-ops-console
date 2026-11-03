"use client";

import type { ReactNode } from "react";
import { BottomSheet, BottomSheetContent, BottomSheetTrigger } from "@/components/ui/bottom-sheet";
import { ICON_STROKE, Sparkles } from "@/components/icons";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { useAssistantRail } from "@/features/shell/railState";
import { COARSE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { PanelPlacement } from "./Panel";

/**
 * The assistant below 1024 px: a fixed bar with one button, and the panel in a bottom sheet. The answers live in
 * the provider above, so closing the sheet never stops a stream; the bar says when one finished meanwhile.
 */
export function MobileAssistant({ panel }: { panel: ReactNode }) {
  const { sheet, openSheet, closeSheet, unread } = useAssistantRail();
  // Tapping "Ask the assistant" puts the cursor in the composer. An Ask why button or a citation does not, on a
  // touch screen, because that would raise the keyboard over the answer.
  const coarse = useMediaQuery(COARSE_QUERY);
  const focusComposer = sheet.via === "bar" || !coarse;
  return (
    <BottomSheet
      open={sheet.open}
      onOpenChange={(next) => (next ? openSheet("bar") : closeSheet())}
    >
      <div
        data-slot="assistant-bar"
        className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-border bg-surface px-[var(--gutter)] pt-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] lg:hidden"
      >
        <BottomSheetTrigger className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-control bg-accent px-3 text-[length:var(--text-body)] leading-[var(--text-body-lh)] font-medium text-on-accent transition-colors duration-[var(--dur-fast)] hover:bg-accent-hover">
          <Sparkles aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
          Ask the assistant
          {unread > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-on-accent/15 px-2 text-[length:var(--text-label)] leading-6">
              <span aria-hidden className="size-1.5 rounded-pill bg-on-accent" />
              {unread === 1 ? "1 new answer" : `${unread} new answers`}
            </span>
          ) : null}
        </BottomSheetTrigger>
        <PaletteButton />
      </div>
      <BottomSheetContent
        title="Assistant"
        className="lg:hidden"
        onOpenAutoFocus={(e) => {
          // The panel puts focus in the composer itself when the person asked to type; otherwise the sheet
          // takes it, so no keyboard rises over an answer.
          e.preventDefault();
          if (!focusComposer && e.currentTarget instanceof HTMLElement) e.currentTarget.focus();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <PanelPlacement value={{ variant: "sheet", focusComposer }}>{panel}</PanelPlacement>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
