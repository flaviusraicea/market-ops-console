"use client";

import { QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";

import { Notice } from "@/components/Notice";
import type { AlertRule } from "@/domain";
import { AlertForm } from "@/features/alerts/AlertForm";
import { alertApi } from "@/features/alerts/api";
import { getAlertsQueryClient } from "@/features/alerts/queryClient";
import { RuleList } from "@/features/alerts/RuleList";
import { setRulesLoadFailed } from "@/features/alerts/summary";
import { useAlertSave } from "@/features/alerts/useAlertSave";

export type AlertsBodyProps = {
  readOnly: boolean;
  onSwitchToAnalyst?: (() => void) | undefined;
  /** The rules the shell showed, so the list is there on the first frame instead of "No rules yet". */
  initialRules?: readonly AlertRule[] | undefined;
};

function Body({ readOnly, onSwitchToAnalyst, initialRules }: AlertsBodyProps) {
  const alerts = useAlertSave(alertApi, initialRules);
  const [loadDismissed, setLoadDismissed] = useState(false);
  const [simulateFail, setSimulateFail] = useState(false);
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
      <AlertForm
        readOnly={readOnly}
        simulateFail={simulateFail}
        onSimulateFailChange={setSimulateFail}
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
          onDelete={(id) => alerts.remove(id, { fail: simulateFail })}
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
 * by the alert mutations alone, so its provider lives here too; the client itself outlives this component
 * (queryClient.ts), so folding the section mid-save loses neither the rollback nor its notice. The read-only
 * notice is AlertsSection's.
 */
export function AlertsBody(props: AlertsBodyProps) {
  // A host that already provides a client (a test, a story) keeps it.
  const outer = useContext(QueryClientContext);
  const client = outer ?? getAlertsQueryClient();
  return (
    <QueryClientProvider client={client}>
      <Body {...props} />
    </QueryClientProvider>
  );
}
