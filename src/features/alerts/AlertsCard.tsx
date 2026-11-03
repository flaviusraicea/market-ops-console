"use client";

import { CardHeader } from "@/components/CardHeader";
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
      <CardHeader title="Alert thresholds" titleId="alerts-h" />
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
