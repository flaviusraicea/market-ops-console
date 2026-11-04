import { statusForDerived, type Dataset, type Fact, type Market } from "@/domain";

/** Largest move one market makes in one tick: ±0.1 %. */
const LIVE_STEP = 0.001;
/**
 * A market never drifts further than ±0.3 % from the figures in data.json, small enough that no status flips
 * within a minute of watching (a status sits at least a few tenths of a point from its threshold).
 */
export const LIVE_BOUND = 0.003;
/** Milliseconds between ticks. */
export const LIVE_INTERVAL_MS = 5000;

/** A fast string hash (FNV-1a) turned into a repeatable number in [0, 1). */
function unit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * How far a market has drifted from its saved revenue after `tick` ticks. A pure function of both inputs.
 * It replays the walk from tick 1 each time: about 2 ms at tick 1000 (some 80 minutes of live), so no cache.
 */
export function driftFactor(marketId: string, tick: number): number {
  let factor = 1;
  for (let k = 1; k <= tick; k++) {
    const step = (unit(`${marketId}:${k}`) * 2 - 1) * LIVE_STEP;
    factor = Math.min(1 + LIVE_BOUND, Math.max(1 - LIVE_BOUND, factor * (1 + step)));
  }
  return factor;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/**
 * The dataset as it reads after `tick` ticks of simulated live data. Only the latest period's `actual` and
 * `units` move; everything else is the saved data, and views of any other selected month ignore the overlay
 * (see `useLiveVM`), so a past period is never revised. Tick 0 is the saved data itself.
 *
 * Each market's given figures for the latest month scale with its facts, so the first tick starts from what
 * data.json says instead of jumping to a re-derived value: revenue and attainment move by the drift factor,
 * growth follows from it. `sharePct` is external market share and never changes. Status is recomputed from
 * the scaled figures with the published rule, the only place the app derives a market's status. The result is
 * marked `meta.simulated` so captions can say so.
 */
export function applyLiveOverlay(ds: Dataset, tick: number): Dataset {
  if (tick <= 0) return ds;
  const latest = ds.meta.latestPeriod;
  const factors = new Map(ds.markets.map((m) => [m.id, driftFactor(m.id, tick)]));

  const series: Fact[] = ds.series.map((f) => {
    if (f.period !== latest) return f;
    const factor = factors.get(f.marketId) ?? 1;
    return { ...f, actual: Math.round(f.actual * factor), units: Math.round(f.units * factor) };
  });

  const markets: Market[] = ds.markets.map((m) => {
    const factor = factors.get(m.id) ?? 1;
    const attainment = round1(m.kpis.forecastAttainmentPct * factor);
    const growth = round1(((1 + m.kpis.growthPct / 100) * factor - 1) * 100);
    return {
      ...m,
      kpis: {
        ...m.kpis,
        revenue: Math.round(m.kpis.revenue * factor),
        growthPct: growth,
        forecastAttainmentPct: attainment,
        status: statusForDerived(attainment, growth),
      },
    };
  });
  return { ...ds, meta: { ...ds.meta, simulated: true }, series, markets };
}
