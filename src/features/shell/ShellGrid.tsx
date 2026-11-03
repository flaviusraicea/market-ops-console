"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { ConnectedAssistantRail } from "./AssistantRail";
import { DashboardColumn } from "./DashboardColumn";
import { useAssistantRail } from "./railState";

/**
 * The page grid. From 1280 px the assistant column is 380 px when open and 48 px when collapsed; between 1024 and
 * 1279 px the column stays 48 px and the open panel overlays the dashboard with a scrim. Below 1024 px the panel
 * sits under the dashboard and there is no rail.
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
        "grid outline-none gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_48px]",
        // Analyst pins its header, so the assistant sticks below it.
        mode === "analyst" ? "[--assistant-top:var(--below-header)]" : "[--assistant-top:1rem]",
        ready &&
          "lg:transition-[grid-template-columns] lg:duration-[var(--dur-base)] lg:ease-[var(--ease)]",
        open && "xl:grid-cols-[minmax(0,1fr)_var(--assistant-w)]",
      )}
    >
      <DashboardColumn>{dashboard}</DashboardColumn>
      <aside aria-labelledby="assistant-h" className="min-w-0">
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
        {/* Always mounted, so "Answer complete" is announced while the panel is collapsed. */}
        <div ref={setLiveHost} role="status" aria-live="polite" className="sr-only" />
      </aside>
    </main>
  );
}
