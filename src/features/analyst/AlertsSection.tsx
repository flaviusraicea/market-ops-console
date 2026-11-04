"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

import { cn } from "@/components/cn";
import { ChevronDown, ICON_STROKE } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  readRuleSummaries,
  readRulesLoadFailed,
  subscribeToLoadFailed,
  subscribeToSummaries,
  summaryOf,
} from "@/features/alerts/summary";
import { useRole } from "@/lib/role";
import { canEditAlerts } from "@/lib/roles";
import { createStoredState } from "@/lib/storedState";
import type { AlertsBody as AlertsBodyType } from "./AlertsBody";
import { AlertsBodyShell } from "./AlertsBodyShell";

const openState = createStoredState("market-ops:alerts-open", "session");
const readOpen = () => openState.read() === "1";
const writeOpen = (next: boolean) => openState.write(next ? "1" : "0");

type Body = typeof AlertsBodyType;
let loaded: Body | null = null;
let loading: Promise<Body> | null = null;
const loadBody = () => (loading ??= import("./AlertsBody").then((m) => (loaded = m.AlertsBody)));

/**
 * The open section's code (the form, zod, TanStack Query) loads on intent: a pointer over the section, focus on its
 * header, or opening it. Until it attaches, the shell shows the same markup with every control disabled.
 */
function useAlertsBody(open: boolean) {
  // A function: wrap it, or useState would call the component as an initializer.
  const [body, setBody] = useState<Body | null>(() => loaded);
  const load = () => {
    if (!body) void loadBody().then((b) => setBody(() => b));
  };
  useEffect(() => {
    if (open && !body) void loadBody().then((b) => setBody(() => b));
  }, [open, body]);
  return { Body: body, load };
}

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
  const loadFailed = useSyncExternalStore(subscribeToLoadFailed, readRulesLoadFailed, () => false);
  const headingId = useId();
  const open = useSyncExternalStore(openState.subscribe, readOpen, () => false);
  const { Body, load } = useAlertsBody(open);

  return (
    <Collapsible open={open} onOpenChange={writeOpen}>
      <section aria-labelledby={`${headingId}`} className="flex flex-col" onPointerEnter={load}>
        <h3 id={`${headingId}`} className="m-0">
          <CollapsibleTrigger
            onFocus={load}
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
              {loadFailed ? "Couldn’t load rules" : summaryOf(rules)}
            </span>
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 px-[var(--pad-card)] pb-[var(--pad-card)]">
            {!open ? null : Body ? (
              <Body readOnly={readOnly} onSwitchToAnalyst={onSwitchToAnalyst} />
            ) : (
              <AlertsBodyShell
                readOnly={readOnly}
                onSwitchToAnalyst={onSwitchToAnalyst}
                rules={rules}
              />
            )}
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
