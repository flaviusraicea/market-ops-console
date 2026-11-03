"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useId, useState, useSyncExternalStore } from "react";

import { cn } from "@/components/cn";
import { ChevronDown, ICON_STROKE } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertForm } from "@/features/alerts/AlertForm";
import { METRIC_LABEL } from "@/features/alerts/labels";
import { RuleList } from "@/features/alerts/RuleList";
import { useAlertSave } from "@/features/alerts/useAlertSave";
import { useRole } from "@/lib/role";
import { canEditAlerts } from "@/lib/roles";
import { createStoredState } from "@/lib/storedState";

const openState = createStoredState("market-ops:alerts-open", "session");
const readOpen = () => openState.read() === "1";
const writeOpen = (next: boolean) => openState.write(next ? "1" : "0");

/** One line for the folded section: the rule count and the rule names, or the kinds of rule you can add. */
function summaryOf(rules: { metric: keyof typeof METRIC_LABEL }[]): string {
  const names = (list: string[]) => list.map((n) => `${n} below`).join(" · ");
  if (rules.length === 0) return `0 rules · ${names(Object.values(METRIC_LABEL))}`;
  const unique = [...new Set(rules.map((r) => METRIC_LABEL[r.metric]))];
  return `${rules.length} ${rules.length === 1 ? "rule" : "rules"} · ${names(unique)}`;
}

/**
 * Alerts folded away at the end of the sheet; opening shows the form and the saved rules.
 */
export function AlertsSection({
  readOnly = false,
  onSwitchToAnalyst,
}: {
  /** An Executive reads the rules but cannot change them. */
  readOnly?: boolean;
  onSwitchToAnalyst?: () => void;
}) {
  const alerts = useAlertSave();
  const headingId = useId();
  const open = useSyncExternalStore(openState.subscribe, readOpen, () => false);

  return (
    <Collapsible open={open} onOpenChange={writeOpen}>
      <section aria-labelledby={`${headingId}`} className="flex flex-col">
        <h3 id={`${headingId}`} className="m-0">
          <CollapsibleTrigger className="flex w-full items-center gap-2 p-[var(--pad-card)] text-left">
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
              {summaryOf(alerts.rules)}
            </span>
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent>
          <div className="flex flex-col gap-4 px-[var(--pad-card)] pb-[var(--pad-card)]">
            {readOnly ? (
              <Notice
                tone="neutral"
                title="Read-only for Executives."
                actions={
                  <Button type="button" variant="ghost" onClick={() => onSwitchToAnalyst?.()}>
                    Switch to Analyst
                  </Button>
                }
              >
                Switch to Analyst to edit rules.
              </Notice>
            ) : null}
            <AlertForm
              readOnly={readOnly}
              saveRule={alerts.save}
              status={alerts.status}
              savedAt={alerts.savedAt}
              failure={alerts.failure}
              onRetry={alerts.retry}
              onDismiss={alerts.dismiss}
              onSwitchToAnalyst={onSwitchToAnalyst}
            />
            <RuleList
              rules={alerts.rules}
              onDelete={alerts.remove}
              deleteFailed={alerts.deleteFailed}
              onDismissDeleteFailed={alerts.dismissDeleteFailed}
              deleteReadOnly={alerts.deleteReadOnly}
              onSwitchToAnalyst={onSwitchToAnalyst}
              readOnly={readOnly}
            />
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

/**
 * The section for the signed-in role. TanStack Query is only used by the alert mutations, so its provider lives
 * here and rides in this lazy chunk instead of the first load.
 */
export function ConnectedAlertsSection() {
  const { role, switchRole } = useRole();
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AlertsSection
        readOnly={!canEditAlerts(role)}
        onSwitchToAnalyst={() => switchRole("analyst")}
      />
    </QueryClientProvider>
  );
}
