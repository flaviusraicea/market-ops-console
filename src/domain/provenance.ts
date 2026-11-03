import type { Dataset } from "./dataset";

/** Where a figure comes from, as captions say it. One place, so no widget spells a label its own way. */
export const SOURCE_LABEL = "Source · data.json";
export const DERIVED_LABEL = "Derived · sum of series";
export const LIVE_LABEL = "Derived · live";

/**
 * The caption for a figure that data.json gives. While the dataset is simulated, a figure that includes the
 * latest month is no longer the saved one, so it reads `Derived · live`. `includesLatest` is false for a view
 * of an earlier month, which live mode does not touch.
 */
export function sourceLabel(ds: Dataset, includesLatest = true): string {
  return ds.meta.simulated && includesLatest ? LIVE_LABEL : SOURCE_LABEL;
}

/** The caption for a figure summed from the series; see `sourceLabel`. */
export function derivedLabel(ds: Dataset, includesLatest = true): string {
  return ds.meta.simulated && includesLatest ? LIVE_LABEL : DERIVED_LABEL;
}
