"use client";

import { AlertForm } from "./AlertForm";
import { RuleList } from "./RuleList";
import { useAlertSave } from "./useAlertSave";

export function AlertsCard() {
  const alerts = useAlertSave();
  return (
    <section
      aria-labelledby="alerts-h"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[var(--pad-card)]"
    >
      <h3
        id="alerts-h"
        className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold tracking-[var(--text-title-ls)]"
      >
        Alert thresholds
      </h3>
      <AlertForm
        saveRule={alerts.save}
        status={alerts.status}
        savedAt={alerts.savedAt}
        failure={alerts.failure}
        onRetry={alerts.retry}
        onDismiss={alerts.dismiss}
      />
      <RuleList
        rules={alerts.rules}
        onDelete={alerts.remove}
        deleteFailed={alerts.deleteFailed}
        onDismissDeleteFailed={alerts.dismissDeleteFailed}
      />
    </section>
  );
}
