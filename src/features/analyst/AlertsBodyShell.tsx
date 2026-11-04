"use client";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import type { AlertRule } from "@/domain";
import { AlertFormShell } from "@/features/alerts/AlertFormShell";
import { RuleList } from "@/features/alerts/RuleList";
import { normalizeRules } from "@/features/alerts/rules";
import type { AlertsBodyProps } from "./AlertsBody";

const noop = () => {};

/**
 * The open Alerts section before its code (the form, zod, TanStack Query) has loaded: the same notice, form and rule
 * list as AlertsBody, with every control disabled. When the body attaches, the controls turn on in place and nothing
 * appears, moves or resizes.
 */
export function AlertsBodyShell({
  readOnly,
  onSwitchToAnalyst,
  rules,
}: AlertsBodyProps & { rules: readonly AlertRule[] }) {
  return (
    <>
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
      <AlertFormShell readOnly={readOnly} />
      <RuleList rules={normalizeRules(rules)} onDelete={noop} readOnly={readOnly} saving />
    </>
  );
}
