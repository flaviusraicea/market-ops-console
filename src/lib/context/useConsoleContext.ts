"use client";

import { useQueryStates } from "nuqs";
import { useCallback, useMemo } from "react";

import type { ContextPatch } from "@/domain";
import { logEvent } from "@/lib/events";
import { isOffline, useNavigationGuard, useNavigationTransition } from "./navigation";
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
  const guard = useNavigationGuard();
  const [raw, setRaw] = useQueryStates(parsers, { shallow: false, scroll: false, startTransition });

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
      const send = () => {
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
      };
      // A change the server has to answer cannot be made offline: hold it, keep the view, offer Retry.
      if (!opts?.shallow && guard && isOffline()) {
        guard.hold({ send });
        return;
      }
      guard?.release();
      send();
    },
    [meta, ctx, setRaw, startTransition, guard],
  );

  const reset = useCallback(() => {
    const send = () => {
      startTransition(() => {
        void setRaw(null, { history: "push" });
      });
    };
    if (guard && isOffline()) {
      guard.hold({ send });
      return;
    }
    guard?.release();
    send();
  }, [setRaw, startTransition, guard]);

  return { ctx, setContext, reset, isPending };
}
