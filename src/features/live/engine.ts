import { analystVM } from "@/features/analyst/viewModel";
import {
  attentionVM,
  overviewVM,
  regionBarsVM,
  stripVM,
  verdictVM,
} from "@/features/overview/viewModel";
import { loadFullDataset } from "@/lib/fullDataset";
import { applyLiveOverlay } from "@/lib/live";
import type { Context, Dataset } from "@/domain";

/** Remembers the last result per function, keyed on the dataset object and the context. */
function memoLast<T>(fn: (ds: Dataset, ctx: Context) => T): (ds: Dataset, ctx: Context) => T {
  let last: { ds: Dataset; key: string; value: T } | undefined;
  return (ds, ctx) => {
    const key = JSON.stringify(ctx);
    if (last && last.ds === ds && last.key === key) return last.value;
    const value = fn(ds, ctx);
    last = { ds, key, value };
    return value;
  };
}

/**
 * Everything live mode needs in the browser: the whole dataset, the overlay and the view-model functions the
 * server uses. This module is only ever loaded with `import()` when Live is first turned on, so none of it is
 * in the first load. A tick recomputes each view model once, however many widgets read it.
 */
export const engine = {
  full: loadFullDataset(),
  overlay: applyLiveOverlay,
  overview: memoLast(overviewVM),
  analyst: memoLast(analystVM),
  verdict: memoLast(verdictVM),
  strip: memoLast(stripVM),
  attention: memoLast(attentionVM),
  regionBars: memoLast(regionBarsVM),
};

export type LiveEngine = typeof engine;
