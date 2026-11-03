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
import { askWhyPrompt, type Context, type Dataset } from "@/domain";

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

const full = loadFullDataset();

/**
 * The Ask why prompt of a market as the saved data states it. The assistant answers from the saved data and
 * never sees the overlay, so a button must not ask about a status that only the simulation has.
 */
function savedAskWhy(marketId: string) {
  const market = full.markets.find((m) => m.id === marketId);
  if (!market) throw new Error(`Unknown market "${marketId}" in a live view model`);
  return askWhyPrompt(market);
}

function analystPinned(ds: Dataset, ctx: Context) {
  const vm = analystVM(ds, ctx);
  if (vm.grid.kind !== "markets") return vm;
  return {
    ...vm,
    grid: { ...vm.grid, rows: vm.grid.rows.map((r) => ({ ...r, askWhy: savedAskWhy(r.id) })) },
  };
}

function attentionPinned(ds: Dataset, ctx: Context) {
  const vm = attentionVM(ds, ctx);
  if (vm.kind !== "markets") return vm;
  return { ...vm, rows: vm.rows.map((r) => ({ ...r, askWhy: savedAskWhy(r.id) })) };
}

/**
 * Everything live mode needs in the browser: the whole dataset, the overlay and the view-model functions the
 * server uses. This module is only ever loaded with `import()` when Live is first turned on, so none of it is
 * in the first load. A tick recomputes each view model once, however many widgets read it.
 */
export const engine = {
  full,
  overlay: applyLiveOverlay,
  overview: memoLast(overviewVM),
  analyst: memoLast(analystPinned),
  verdict: memoLast(verdictVM),
  strip: memoLast(stripVM),
  attention: memoLast(attentionPinned),
  regionBars: memoLast(regionBarsVM),
};

export type LiveEngine = typeof engine;
