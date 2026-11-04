"use client";

import type { AlertRule } from "@/domain";
import { AlertFormShell } from "@/features/alerts/AlertFormShell";
import { RuleList } from "@/features/alerts/RuleList";
import { normalizeRules } from "@/features/alerts/rules";

const noop = () => {};

/**
 * The open Alerts section before its code (the form, zod, TanStack Query) has loaded: the same form and rule list as
 * AlertsBody, with every control disabled. When the body attaches, the controls turn on in place and nothing
 * appears, moves or resizes. The read-only notice sits outside both, in AlertsSection.
 */
export function AlertsBodyShell({
  readOnly,
  rules,
  busy = true,
}: {
  readOnly: boolean;
  rules: readonly AlertRule[];
  /** False once the code has failed to load: the form is still disabled, but nothing is on its way. */
  busy?: boolean;
}) {
  return (
    <>
      <AlertFormShell readOnly={readOnly} busy={busy} />
      <RuleList rules={normalizeRules(rules)} onDelete={noop} readOnly={readOnly} saving />
    </>
  );
}
