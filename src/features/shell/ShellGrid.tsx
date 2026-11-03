"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import { ConnectedAssistantRail } from "./AssistantRail";
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
  return (
    <main
      id="main"
      className={cn(
        "grid gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_48px] lg:transition-[grid-template-columns] lg:duration-[var(--dur-base)] lg:ease-[var(--ease)]",
        open && "xl:grid-cols-[minmax(0,1fr)_var(--assistant-w)]",
      )}
    >
      <section aria-label="Dashboard" className="min-w-0">
        {dashboard}
      </section>
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
