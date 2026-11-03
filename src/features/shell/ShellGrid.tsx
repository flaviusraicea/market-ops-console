"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { MobileAssistant } from "@/features/assistant/MobileAssistant";
import { useHydrated } from "@/lib/useHydrated";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { ConnectedAssistantRail } from "./AssistantRail";
import { DashboardColumn } from "./DashboardColumn";
import { useAssistantRail } from "./railState";

/**
 * The page grid. From 1280 px the assistant column is 380 px when open and 48 px when collapsed; between 1024 and
 * 1279 px the column stays 48 px and the open panel overlays the dashboard with a scrim. Below 1024 px there is
 * no column and no rail: the assistant is a bottom bar that opens a sheet.
 */
export function ShellGrid({
  dashboard,
  assistant,
}: {
  dashboard: ReactNode;
  assistant: ReactNode;
}) {
  const { open, collapse, setLiveHost } = useAssistantRail();
  const mode = useConsoleContext().ctx.mode;
  // The server cannot know the viewport, so it sends both: the column is hidden by CSS below 1024 px and the bar
  // above it. Once hydrated, only the one that applies stays mounted.
  const hydrated = useHydrated();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const showColumn = !hydrated || desktop;
  const showSheet = !hydrated || !desktop;
  // The stored choice lands right after hydration; the width transition starts only once it has, so a
  // reload does not animate from the default.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] outline-none gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_48px]",
        // Analyst pins its header, so the assistant sticks below it.
        mode === "analyst" ? "[--assistant-top:var(--below-header)]" : "[--assistant-top:1rem]",
        ready &&
          "lg:transition-[grid-template-columns] lg:duration-[var(--dur-base)] lg:ease-[var(--ease)]",
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
              className="fixed inset-0 z-40 hidden bg-ink/[.32] lg:max-xl:block"
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
