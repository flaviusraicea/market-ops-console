"use client";

import { useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";

import type { ContextPatch } from "@/domain";
import { logEvent } from "@/lib/events";
import { applyContextChange, normalizeContext } from "./invariants";
import { useConsoleMeta } from "./meta";
import { contextParsers } from "./parsers";

export type SetContextOptions = { history?: "push" | "replace" };

/** The only writer of navigation state. Every widget reads and writes the URL through this hook. */
export function useConsoleContext() {
  const meta = useConsoleMeta();
  const parsers = useMemo(() => contextParsers(meta), [meta]);
  const [raw, setRaw] = useQueryStates(parsers, { shallow: false, scroll: false });

  const ctx = useMemo(() => normalizeContext(meta, raw), [meta, raw]);

  const setContext = useCallback(
    (partial: ContextPatch, opts?: SetContextOptions) => {
      const result = applyContextChange(meta, ctx, partial);
      if (!result.ok) {
        if (process.env.NODE_ENV !== "production") throw new Error(result.reason);
        logEvent({ type: "invalid_context", message: result.reason });
        return;
      }
      const { next } = result;
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
        { history: opts?.history ?? result.history },
      );
      logEvent({ type: "navigate", ctx: next });
    },
    [meta, ctx, setRaw],
  );

  const reset = useCallback(() => {
    void setRaw(null, { history: "push" });
  }, [setRaw]);

  return { ctx, setContext, reset };
}
