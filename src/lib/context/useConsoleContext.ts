"use client";

import { useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";

import type { ContextPatch } from "@/domain";
import { logEvent } from "@/lib/events";
import {
  isOffline,
  useNavigationGuard,
  useNavigationTransition,
  useOptimisticContext,
} from "./navigation";
import { applyContextChange, normalizeContext, type RawContext } from "./invariants";
import { useConsoleMeta } from "./meta";
import { contextParsers } from "./parsers";

export type SetContextOptions = {
  history?: "push" | "replace";
  /** Skip the server round trip: for a change only the client reads (`cite`). Default false. */
  shallow?: boolean;
};

/** The only writer of navigation state. Every widget reads and writes the URL through this hook. */
export function useConsoleContext() {
  const meta = useConsoleMeta();
  const parsers = useMemo(() => contextParsers(meta), [meta]);
  const [isPending, startTransition] = useNavigationTransition();
  const [optimistic, setOptimistic] = useOptimisticContext();
  const guard = useNavigationGuard();
  const [url, setRaw] = useQueryStates(parsers, { shallow: false, scroll: false, startTransition });
  // While a write waits for the server, every reader already sees where it is going: the click shows at once and the
  // data follows (the transition commit drops the optimistic value). A write held offline sets nothing, so the view
  // stays as it is.
  const raw: RawContext = optimistic ?? url;

  const ctx = useMemo(() => normalizeContext(meta, raw), [meta, raw]);

  const setContext = useCallback(
    (partial: ContextPatch, opts?: SetContextOptions) => {
      const result = applyContextChange(meta, ctx, partial);
      if (!result.ok) {
        if (process.env.NODE_ENV !== "production") throw new Error(result.reason);
        logEvent({ type: "invalid_context", message: result.reason });
        return;
      }
      const { next, history } = result;
      const values = {
        region: next.region ?? null,
        market: next.market ?? null,
        product: next.product ?? null,
        period: next.period,
        mode: next.mode,
        metric: next.metric,
        basis: next.basis,
        cite: next.cite ?? null,
        facts: next.facts ?? null,
      };
      function commit() {
        // A retried navigation keeps its notice up until it lands; any other navigation supersedes the hold.
        if (!guard?.sendingRef.current) guard?.release();
        startTransition(() => {
          setOptimistic(values);
          void setRaw(values, { history: opts?.history ?? history, shallow: opts?.shallow ?? false });
        });
        logEvent({ type: "navigate", ctx: next });
      }
      // A change the server has to answer cannot be made offline: hold it, keep the view, offer Retry.
      function attempt() {
        if (!opts?.shallow && guard && isOffline()) guard.hold({ retry: attempt });
        else commit();
      }
      attempt();
    },
    [meta, ctx, setRaw, setOptimistic, startTransition, guard],
  );

  const reset = useCallback(() => {
    function attempt() {
      if (guard && isOffline()) {
        guard.hold({ retry: attempt });
        return;
      }
      if (!guard?.sendingRef.current) guard?.release();
      startTransition(() => {
        void setRaw(null, { history: "push" });
      });
    }
    attempt();
  }, [setRaw, startTransition, guard]);

  return { ctx, setContext, reset, isPending };
}
