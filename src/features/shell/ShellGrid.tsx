"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import { MobileAssistant } from "@/features/assistant/MobileAssistant";
import { useHydrated } from "@/lib/useHydrated";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { ConnectedAssistantRail } from "./AssistantRail";
import { DashboardColumn } from "./DashboardColumn";
import { useAssistantRail } from "./railState";

/**
 * The page grid. The columns switch at once (animating them would reflow the dashboard and re-measure every
 * chart on each frame); the panel itself enters with a short slide and fade. From 1280 px the assistant column is
 * 380 px when open and 48 px when collapsed; between 1024 and 1279 px the column stays 48 px and the open panel
 * overlays the dashboard with a scrim. Below 1024 px there is no column and no rail: the assistant is a bottom
 * bar that opens a sheet.
 */
export function ShellGrid({
  dashboard,
  assistant,
}: {
  dashboard: ReactNode;
  assistant: ReactNode;
}) {
  const { open, collapse, setLiveHost } = useAssistantRail();
  // The server cannot know the viewport, so it sends both: the column is hidden by CSS below 1024 px and the bar
  // above it. Once hydrated, only the one that applies stays mounted.
  const hydrated = useHydrated();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const showColumn = !hydrated || desktop;
  const showSheet = !hydrated || !desktop;
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] outline-none gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_48px]",
        // The header is pinned in both modes, so the assistant sticks below it.
        "[--assistant-top:var(--below-header)]",
        open && "xl:grid-cols-[minmax(0,1fr)_var(--assistant-w)]",
      )}
    >
      <DashboardColumn>{dashboard}</DashboardColumn>
      {showColumn ? (
        <aside aria-labelledby="assistant-h" className="min-w-0 max-lg:hidden">
          <ConnectedAssistantRail />
          {assistant}
          {open ? (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              data-slot="scrim"
              onClick={collapse}
              className="fixed inset-0 z-40 hidden bg-scrim lg:max-xl:block"
            />
          ) : null}
        </aside>
      ) : null}
      {showSheet ? <MobileAssistant panel={assistant} /> : null}
      {/* Always mounted, so "Answer complete" is announced while the panel is collapsed or the sheet is closed. */}
      <div ref={setLiveHost} role="status" aria-live="polite" className="sr-only" />
    </main>
  );
}
