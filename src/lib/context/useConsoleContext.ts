"use client";

import { useQueryStates } from "nuqs";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { ContextPatch } from "@/domain";
import { logEvent } from "@/lib/events";
import { useNavigationTransition } from "./navigation";
import { applyContextChange, normalizeContext } from "./invariants";
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
  const [raw, setRaw] = useQueryStates(parsers, { shallow: false, scroll: false, startTransition });

  const ctx = useMemo(() => normalizeContext(meta, raw), [meta, raw]);

  // An address without `mode` reads as the role's view. Once, on arrival, write it in (replacing, not pushing) so the
  // link names the view. Later changes go through setContext, which always writes it.
  const arrivalMode = useRef(raw.mode);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("mode")) return;
    void setRaw({ mode: arrivalMode.current }, { history: "replace", shallow: true });
  }, [setRaw]);

  const setContext = useCallback(
    (partial: ContextPatch, opts?: SetContextOptions) => {
      const result = applyContextChange(meta, ctx, partial);
      if (!result.ok) {
        if (process.env.NODE_ENV !== "production") throw new Error(result.reason);
        logEvent({ type: "invalid_context", message: result.reason });
        return;
      }
      const { next } = result;
      startTransition(() => {
        void setRaw(
          {
            region: next.region ?? null,
            market: next.market ?? null,
            product: next.product ?? null,
            period: next.period,
            mode: next.mode,
            metric: next.metric,
            basis: next.basis,
            cite: next.cite ?? null,
            facts: next.facts ?? null,
          },
          { history: opts?.history ?? result.history, shallow: opts?.shallow ?? false },
        );
      });
      logEvent({ type: "navigate", ctx: next });
    },
    [meta, ctx, setRaw, startTransition],
  );

  const reset = useCallback(() => {
    startTransition(() => {
      void setRaw(null, { history: "push" });
    });
  }, [setRaw, startTransition]);

  return { ctx, setContext, reset, isPending };
}
