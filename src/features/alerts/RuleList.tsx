"use client";

import { useRef, useState } from "react";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/cn";
import { evaluateRule } from "@/domain";
import { useDataset } from "@/lib/context/dataset";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import { evaluationLine, ruleSentence, scopeToValue } from "./labels";
import type { RuleRow } from "./useAlertSave";

export function RuleList({
  rules,
  onDelete,
  deleteFailed = false,
  onDismissDeleteFailed,
}: {
  rules: RuleRow[];
  onDelete: (id: string) => void;
  deleteFailed?: boolean;
  onDismissDeleteFailed?: () => void;
}) {
  const ds = useDataset();
  const [target, setTarget] = useState<RuleRow | null>(null);
  const container = useRef<HTMLDivElement>(null);

  return (
    <div ref={container} tabIndex={-1} className="flex flex-col gap-2 outline-none">
      {deleteFailed ? (
        <Notice
          title="Couldn't delete"
          actions={
            <Button type="button" variant="ghost" onClick={() => onDismissDeleteFailed?.()}>
              Dismiss
            </Button>
          }
        >
          The rule was restored.
        </Notice>
      ) : null}
      {rules.length === 0 ? (
        <p className="text-ink-muted">No alert rules yet. Add one to watch a threshold.</p>
      ) : (
        <ul aria-label="Saved alert rules">
          {rules.map((rule) => {
            const sentence = ruleSentence(ds, rule);
            const names = evaluateRule(ds, rule).breaching.map((m) => m.name);
            return (
              <li
                key={`${rule.metric}:${scopeToValue(rule.scope)}`}
                className="flex items-start justify-between gap-3 border-t border-grid py-2 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className={cn("font-medium", rule.pending ? "text-ink-muted" : "text-ink")}>
                    {sentence}
                    {rule.pending ? (
                      <span className="ml-2 font-normal text-ink-muted">Saving…</span>
                    ) : null}
                  </p>
                  <p
                    className={cn(
                      "text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
                      rule.pending ? "text-ink-muted" : "text-ink-2",
                    )}
                  >
                    {evaluationLine(names)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={rule.pending}
                  aria-label={`Delete ${sentence}`}
                  onClick={() => setTarget(rule)}
                >
                  Delete
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <DeleteAlertDialog
        label={target ? ruleSentence(ds, target) : ""}
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        onConfirm={() => {
          if (target?.id) onDelete(target.id);
          setTarget(null);
          // The row that held focus is gone, so hand focus to the list.
          requestAnimationFrame(() => container.current?.focus());
        }}
      />
    </div>
  );
}
