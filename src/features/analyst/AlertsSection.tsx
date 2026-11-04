"use client";

import dynamic from "next/dynamic";
import { useId, useSyncExternalStore } from "react";

import { cn } from "@/components/cn";
import { ChevronDown, ICON_STROKE } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { readRuleSummaries, subscribeToSummaries, summaryOf } from "@/features/alerts/summary";
import { useRole } from "@/lib/role";
import { canEditAlerts } from "@/lib/roles";
import { createStoredState } from "@/lib/storedState";

const openState = createStoredState("market-ops:alerts-open", "session");
const readOpen = () => openState.read() === "1";
const writeOpen = (next: boolean) => openState.write(next ? "1" : "0");

const loadBody = () => import("./AlertsBody");
const LazyAlertsBody = dynamic(() => loadBody().then((m) => m.AlertsBody), {
  loading: () => (
    <div aria-busy="true" aria-label="Loading alerts" className="flex flex-col gap-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  ),
});
const NO_RULES: ReturnType<typeof readRuleSummaries> = [];

/** Alerts folded away at the end of the sheet; opening shows the form and the saved rules. */
export function AlertsSection({
  readOnly = false,
  onSwitchToAnalyst,
}: {
  /** An Executive reads the rules but cannot change them. */
  readOnly?: boolean;
  onSwitchToAnalyst?: () => void;
}) {
  const rules = useSyncExternalStore(subscribeToSummaries, readRuleSummaries, () => NO_RULES);
  const headingId = useId();
  const open = useSyncExternalStore(openState.subscribe, readOpen, () => false);

  return (
    <Collapsible open={open} onOpenChange={writeOpen}>
      <section aria-labelledby={`${headingId}`} className="flex flex-col">
        <h3 id={`${headingId}`} className="m-0">
          <CollapsibleTrigger
            // The form loads on first open; starting on hover or focus hides the wait.
            onPointerEnter={() => void loadBody()}
            onFocus={() => void loadBody()}
            className="flex w-full items-center gap-2 p-[var(--pad-card)] text-left"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-ink-muted transition-transform duration-[var(--dur-fast)]",
                !open && "-rotate-90",
              )}
              strokeWidth={ICON_STROKE}
            />
            <Eyebrow className="text-ink">Alerts</Eyebrow>
            <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-normal text-ink-muted">
              {summaryOf(rules)}
            </span>
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 px-[var(--pad-card)] pb-[var(--pad-card)]">
            {open ? (
              <LazyAlertsBody readOnly={readOnly} onSwitchToAnalyst={onSwitchToAnalyst} />
            ) : null}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

/** The section for the signed-in role. */
export function ConnectedAlertsSection() {
  const { role, switchRole } = useRole();
  return (
    <AlertsSection
      readOnly={!canEditAlerts(role)}
      onSwitchToAnalyst={() => switchRole("analyst")}
    />
  );
}
