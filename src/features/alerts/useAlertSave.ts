"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import type { AlertRule } from "@/domain";
import { logEvent, reportError } from "@/lib/events";
import { ReadOnlyRoleError, alertApi, type AlertApi } from "./api";
import { scopeToValue } from "./labels";
import { subscribeToRules } from "./storage";

export const ALERTS_KEY = ["alerts"] as const;

export const DEFAULT_THRESHOLDS = { growth: 0, attainment: 95 } as const;

/** A rule in the list; `pending` while its save or delete has not been confirmed. */
export type RuleRow = AlertRule & { pending?: boolean };

type SaveVars = { rules: AlertRule[]; fail: boolean };

/** What the Notice shows after a failed save: the payload to retry and the values the form went back to. */
export type SaveFailure = {
  vars: SaveVars;
  restored: { growth: number; attainment: number };
  /** The role may not edit rules, so Try again would fail the same way. */
  readOnly: boolean;
};

export type SaveStatus = "idle" | "saving" | "saved";

const keyOf = (r: Pick<AlertRule, "metric" | "scope">) => `${r.metric}:${scopeToValue(r.scope)}`;

/** Inserts or replaces by metric and scope, marking the row pending. Existing rows keep their id. */
function upsertPending(rows: RuleRow[], incoming: AlertRule[]): RuleRow[] {
  const next = [...rows];
  for (const rule of incoming) {
    const i = next.findIndex((r) => keyOf(r) === keyOf(rule));
    const current = next[i];
    if (current) next[i] = { ...rule, id: current.id, createdAt: current.createdAt, pending: true };
    else next.push({ ...rule, id: `pending-${keyOf(rule)}`, pending: true });
  }
  return next;
}

const SCOPE_RANK = { portfolio: 0, region: 1, market: 2 } as const;

/**
 * One row per metric and scope, in a fixed order: All markets, regions, then markets, each growth before
 * attainment. Whatever order or duplicates the server sends, the list reads the same.
 */
export function normalizeRules<T extends AlertRule>(rows: readonly T[]): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) byKey.set(keyOf(r), r);
  const rank = (r: AlertRule) => {
    const v = scopeToValue(r.scope);
    return [
      SCOPE_RANK[v.split(":")[0] as keyof typeof SCOPE_RANK],
      v,
      r.metric === "growth" ? 0 : 1,
    ] as const;
  };
  return [...byKey.values()].sort((a, b) => {
    const [ka, va, ma] = rank(a);
    const [kb, vb, mb] = rank(b);
    return ka - kb || va.localeCompare(vb) || ma - mb;
  });
}

/** The thresholds a scope had in a snapshot, or the defaults when it had none. */
function thresholdsFor(rows: RuleRow[], scope: AlertRule["scope"]) {
  const find = (metric: AlertRule["metric"]) =>
    rows.find((r) => r.metric === metric && keyOf(r) === keyOf({ metric, scope }))?.threshold;
  return {
    growth: find("growth") ?? DEFAULT_THRESHOLDS.growth,
    attainment: find("attainment") ?? DEFAULT_THRESHOLDS.attainment,
  };
}

/** Save and delete with optimistic updates. Architecture 7: idle -> saving -> saved | failed -> saving. */
/** A refused edit (the Executive role) is expected and shown to the user; anything else is reported. */
function reportAlertFailure(error: Error) {
  if (!(error instanceof ReadOnlyRoleError)) reportError(error, { source: "fetch", route: "/api/alerts" });
}

export function useAlertSave(api: AlertApi = alertApi) {
  const qc = useQueryClient();
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [deleteReadOnly, setDeleteReadOnly] = useState(false);

  const list = useQuery({
    queryKey: ALERTS_KEY,
    queryFn: () => api.listRules(),
    select: (rows) => normalizeRules(rows),
  });

  /** Refetch once the last in-flight save or delete finishes, so an early response cannot overwrite a later one. */
  const settle = () => {
    if (qc.isMutating({ mutationKey: ALERTS_KEY }) <= 1)
      void qc.invalidateQueries({ queryKey: ALERTS_KEY });
  };

  // Another tab saved or deleted a rule.
  useEffect(
    () => subscribeToRules(() => void qc.invalidateQueries({ queryKey: ALERTS_KEY })),
    [qc],
  );

  const save = useMutation<AlertRule[], Error, SaveVars, { previous: RuleRow[] }>({
    mutationKey: ALERTS_KEY,
    mutationFn: ({ rules, fail }) => Promise.all(rules.map((r) => api.saveRule(r, { fail }))),
    onMutate: async ({ rules }) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<RuleRow[]>(ALERTS_KEY) ?? [];
      qc.setQueryData<RuleRow[]>(ALERTS_KEY, upsertPending(previous, rules));
      setFailure(null);
      return { previous };
    },
    onError: (error, vars, ctx) => {
      const previous = ctx?.previous ?? [];
      qc.setQueryData<RuleRow[]>(ALERTS_KEY, previous);
      const scope = vars.rules[0]?.scope ?? "portfolio";
      setFailure({
        vars,
        restored: thresholdsFor(previous, scope),
        readOnly: error instanceof ReadOnlyRoleError,
      });
      logEvent({ type: "alert_save_failed", message: error.message });
      reportAlertFailure(error);
    },
    onSuccess: () => {
      setFailure(null);
      setSavedAt(Date.now());
    },
    onSettled: () => settle(),
  });

  const remove = useMutation<void, Error, { id: string; fail?: boolean }, { previous: RuleRow[] }>({
    mutationKey: ALERTS_KEY,
    mutationFn: ({ id, fail }) => api.deleteRule(id, { fail: fail ?? false }),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<RuleRow[]>(ALERTS_KEY) ?? [];
      qc.setQueryData<RuleRow[]>(
        ALERTS_KEY,
        previous.filter((r) => r.id !== id),
      );
      setDeleteFailed(false);
      setDeleteReadOnly(false);
      return { previous };
    },
    onError: (error, _vars, ctx) => {
      qc.setQueryData<RuleRow[]>(ALERTS_KEY, ctx?.previous ?? []);
      setDeleteFailed(true);
      setDeleteReadOnly(error instanceof ReadOnlyRoleError);
      logEvent({ type: "alert_save_failed", message: error.message });
      reportAlertFailure(error);
    },
    onSettled: () => settle(),
  });

  const status: SaveStatus = save.isPending
    ? "saving"
    : savedAt !== null && !failure
      ? "saved"
      : "idle";

  return {
    rules: (list.data ?? []) as RuleRow[],
    isLoading: list.isPending,
    status,
    savedAt,
    failure,
    save: useCallback(
      (rules: AlertRule[], opts: { fail: boolean }) => save.mutate({ rules, fail: opts.fail }),
      [save],
    ),
    /** Re-sends the failed payload; `fail` defaults to what it was, so unticking Simulate failure lets it through. */
    retry: useCallback(
      (opts?: { fail?: boolean }) => {
        if (failure)
          save.mutate({ rules: failure.vars.rules, fail: opts?.fail ?? failure.vars.fail });
      },
      [failure, save],
    ),
    dismiss: useCallback(() => setFailure(null), []),
    remove: useCallback((id: string) => remove.mutate({ id }), [remove]),
    deleteFailed,
    deleteReadOnly,
    dismissDeleteFailed: useCallback(() => setDeleteFailed(false), []),
  };
}
