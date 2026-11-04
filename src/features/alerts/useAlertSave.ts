"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type MutationState,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AlertRule } from "@/domain";
import { logEvent, reportError } from "@/lib/events";
import { ReadOnlyRoleError, alertApi, type AlertApi } from "./api";
import { DEFAULT_THRESHOLDS, keyOf, normalizeRules } from "./rules";
import { subscribeToRules } from "./storage";

const ALERTS_KEY = ["alerts"] as const;
/** The save and delete mutations share the list's prefix, so one count covers both; the save has its own key too. */
const SAVE_KEY = [...ALERTS_KEY, "save"] as const;

/** A rule in the list; `pending` while its save or delete has not been confirmed. */
export type RuleRow = AlertRule & { pending?: boolean };

type SaveVars = { rules: AlertRule[]; fail: boolean };
type SaveContext = { previous: RuleRow[] };
type SaveState = Pick<
  MutationState<AlertRule[], Error, SaveVars, SaveContext>,
  "status" | "error" | "variables" | "context"
>;

/** What the Notice shows after a failed save: the payload to retry and the values the form went back to. */
export type SaveFailure = {
  vars: SaveVars;
  restored: { growth: number; attainment: number };
  /** The role may not edit rules, so Try again would fail the same way. */
  readOnly: boolean;
};

export type SaveStatus = "idle" | "saving" | "saved";

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
  if (!(error instanceof ReadOnlyRoleError))
    reportError(error, { source: "fetch", route: "/api/alerts" });
}

/**
 * `initial` is what was on screen before this hook mounted (the shell's list, read from storage). It stands in
 * until the first read lands, so the list never shows a false "No rules yet" for a frame. A failed read still
 * reports `loadFailed`, because placeholder data is not data.
 */
export function useAlertSave(api: AlertApi = alertApi, initial?: readonly AlertRule[]) {
  const qc = useQueryClient();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [deleteReadOnly, setDeleteReadOnly] = useState(false);

  const list = useQuery<readonly AlertRule[], Error, RuleRow[]>({
    queryKey: ALERTS_KEY,
    queryFn: () => api.listRules(),
    ...(initial ? { placeholderData: initial } : {}),
    select: (rows) => normalizeRules(rows),
  });
  const { refetch } = list;

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

  // The mutation's own callbacks run on the client's cache, so they still roll back and report when the section
  // that mounted this hook has folded away mid-save (the client outlives it: features/alerts/queryClient.ts).
  const save = useMutation<AlertRule[], Error, SaveVars, SaveContext>({
    mutationKey: SAVE_KEY,
    mutationFn: ({ rules, fail }) => Promise.all(rules.map((r) => api.saveRule(r, { fail }))),
    onMutate: async ({ rules }) => {
      await qc.cancelQueries({ queryKey: ALERTS_KEY });
      const previous = qc.getQueryData<RuleRow[]>(ALERTS_KEY) ?? [];
      qc.setQueryData<RuleRow[]>(ALERTS_KEY, upsertPending(previous, rules));
      return { previous };
    },
    onError: (error, _vars, ctx) => {
      qc.setQueryData<RuleRow[]>(ALERTS_KEY, ctx?.previous ?? []);
      logEvent({ type: "alert_save_failed", message: error.message });
      reportAlertFailure(error);
    },
    onSuccess: () => setSavedAt(Date.now()),
    onSettled: () => settle(),
  });

  // The failure notice is read from the mutation cache, not kept in this component: the latest save, if it failed.
  // A new save (pending) hides it, a success clears it, and it is still there after the section folds and reopens.
  const saves = useMutationState<SaveState>({
    filters: { mutationKey: SAVE_KEY, exact: true },
    select: ({ state }) => ({
      status: state.status,
      error: state.error,
      variables: state.variables as SaveVars | undefined,
      context: state.context as SaveContext | undefined,
    }),
  });
  const last = saves.at(-1);
  const failure = useMemo<SaveFailure | null>(() => {
    if (!last || last.status !== "error" || !last.variables) return null;
    const previous = last.context?.previous ?? [];
    return {
      vars: last.variables,
      restored: thresholdsFor(previous, last.variables.rules[0]?.scope ?? "portfolio"),
      readOnly: last.error instanceof ReadOnlyRoleError,
    };
  }, [last]);
  const dismiss = useCallback(() => {
    const cache = qc.getMutationCache();
    for (const m of cache.findAll({ mutationKey: SAVE_KEY, exact: true, status: "error" }))
      cache.remove(m);
  }, [qc]);

  const remove = useMutation<void, Error, { id: string; fail?: boolean }, { previous: RuleRow[] }>({
    mutationKey: [...ALERTS_KEY, "delete"],
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

  const saving = save.isPending || last?.status === "pending";
  const status: SaveStatus = saving ? "saving" : savedAt !== null ? "saved" : "idle";

  return {
    rules: list.data ?? [],
    /** The saved rules could not be read. Shown as a failed load, never as "0 rules". */
    loadFailed: list.isLoadingError,
    reloading: list.isFetching,
    reload: useCallback(() => void refetch(), [refetch]),
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
    dismiss,
    /** `fail` is the Simulate failure box: the delete is refused and the rule comes back. */
    remove: useCallback(
      (id: string, opts?: { fail?: boolean }) => remove.mutate({ id, fail: opts?.fail ?? false }),
      [remove],
    ),
    deleteFailed,
    deleteReadOnly,
    dismissDeleteFailed: useCallback(() => setDeleteFailed(false), []),
  };
}
