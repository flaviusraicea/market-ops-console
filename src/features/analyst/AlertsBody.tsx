"use client";

import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { AlertForm } from "@/features/alerts/AlertForm";
import { RuleList } from "@/features/alerts/RuleList";
import { setRulesLoadFailed } from "@/features/alerts/summary";
import { useAlertSave } from "@/features/alerts/useAlertSave";

export type AlertsBodyProps = {
  readOnly: boolean;
  onSwitchToAnalyst?: (() => void) | undefined;
};

function Body({ readOnly, onSwitchToAnalyst }: AlertsBodyProps) {
  const alerts = useAlertSave();
  const [loadDismissed, setLoadDismissed] = useState(false);
  useEffect(() => setRulesLoadFailed(alerts.loadFailed), [alerts.loadFailed]);
  return (
    <>
      {alerts.loadFailed ? (
        // The list is never shown as empty after a failed read; Dismiss only hides the notice.
        <Notice
          tone="error"
          title="Couldn’t load alert rules"
          open={!loadDismissed}
          retrying={alerts.reloading}
          onRetry={alerts.reload}
          onDismiss={() => setLoadDismissed(true)}
          className="mt-0 mb-0"
        />
      ) : null}
      {readOnly ? (
        <Notice
          tone="fallback"
          title="Read-only for Executives."
          actions={
            <Button type="button" variant="ghost" size="sm" onClick={() => onSwitchToAnalyst?.()}>
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
      {alerts.loadFailed ? null : (
        <RuleList
          rules={alerts.rules}
          onDelete={alerts.remove}
          deleteFailed={alerts.deleteFailed}
          onDismissDeleteFailed={alerts.dismissDeleteFailed}
          deleteReadOnly={alerts.deleteReadOnly}
          onSwitchToAnalyst={onSwitchToAnalyst}
          readOnly={readOnly}
          saving={alerts.status === "saving"}
        />
      )}
    </>
  );
}

/**
 * The open Alerts section: the form, the saved rules and their mutations. It loads only when the section is
 * opened, so zod, react-hook-form and TanStack Query stay out of the Analyst first load. TanStack Query is used
 * by the alert mutations alone, so its provider lives here too.
 */
export function AlertsBody(props: AlertsBodyProps) {
  // A host that already provides a client (a test, a story) keeps it.
  const outer = useContext(QueryClientContext);
  const [client] = useState(() => outer ?? new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Body {...props} />
    </QueryClientProvider>
  );
}
