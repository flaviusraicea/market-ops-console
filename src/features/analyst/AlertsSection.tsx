"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";

import { cn } from "@/components/cn";
import { ChevronDown, ICON_STROKE } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RuleList } from "@/features/alerts/RuleList";
import { normalizeRules } from "@/features/alerts/rules";
import {
  readRuleSummaries,
  readRulesLoadFailed,
  subscribeToLoadFailed,
  subscribeToSummaries,
  summaryOf,
} from "@/features/alerts/summary";
import { reportError } from "@/lib/events";
import { useRole } from "@/lib/role";
import { canEditAlerts } from "@/lib/roles";
import { lazyOnce } from "@/lib/lazyOnce";
import { createStoredState } from "@/lib/storedState";

const openState = createStoredState("market-ops:alerts-open", "session");
const readOpen = () => openState.read() === "1";
const writeOpen = (next: boolean) => openState.write(next ? "1" : "0");

/** The open section's code, fetched once for the page; a failed fetch is forgotten, so Retry fetches it again. */
const body = lazyOnce(() => import("./AlertsBody").then((m) => m.AlertsBody));

/**
 * The open section's code (the form, zod, TanStack Query) loads on intent: a pointer over the section, focus on its
 * header, or opening it. Until it attaches, the saved rules are listed and a placeholder holds the form's place.
 * If the chunk fails to load (a flaky network, a new deploy), the open section says so and offers Retry.
 */
function useAlertsBody(open: boolean) {
  const [Body, setBody] = useState(body.peek);
  const [failed, setFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const load = useCallback(() => {
    void body.load().then(
      (loaded) => {
        setBody(() => loaded);
        setFailed(false);
        setRetrying(false);
      },
      (error: unknown) => {
        reportError(error, { source: "promise" });
        setFailed(true);
        setRetrying(false);
      },
    );
  }, []);
  useEffect(() => {
    if (open && !Body && !failed) load();
  }, [open, Body, failed, load]);
  const retry = () => {
    setRetrying(true);
    load();
  };
  return { Body, load: Body ? undefined : load, failed: failed && !Body, retrying, retry };
}

const NO_RULES: ReturnType<typeof readRuleSummaries> = [];
const noop = () => {};

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
  const { Body, load, failed, retrying, retry } = useAlertsBody(open);

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
            {open && failed ? (
              <Notice
                tone="error"
                title="Couldn’t load the alert editor"
                onRetry={retry}
                retrying={retrying}
                className="mt-0 mb-0"
              />
            ) : null}
            {open && readOnly ? (
              // Outside the shell/body switch, so it is the same node before and after the body attaches and
              // focus on Switch to Analyst survives the swap.
              <Notice
                tone="fallback"
                title="Read-only for Executives."
                actions={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSwitchToAnalyst?.()}
                  >
                    Switch to Analyst
                  </Button>
                }
              >
                Switch to Analyst to edit rules.
              </Notice>
            ) : null}
            {!open ? null : Body ? (
              <Body
                readOnly={readOnly}
                onSwitchToAnalyst={onSwitchToAnalyst}
                initialRules={rules}
              />
            ) : (
              // The rules are on screen from the first frame; the editor takes its place when its code attaches.
              <>
                {failed ? null : (
                  <div
                    role="status"
                    aria-busy="true"
                    className="rounded-control border border-border p-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
                  >
                    Loading the alert editor…
                  </div>
                )}
                <RuleList
                  rules={normalizeRules(rules)}
                  onDelete={noop}
                  readOnly={readOnly}
                  saving
                />
              </>
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
