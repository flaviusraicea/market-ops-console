import {
  attainmentPct,
  factsFor,
  growthPct,
  statusForDerived,
  totals,
  type Dataset,
  type Fact,
  type Market,
} from "@/domain";

/** Largest move one market makes in one tick: ±2 %. */
export const LIVE_STEP = 0.02;
/** A market never drifts further than ±8 % from the figures in data.json. */
export const LIVE_BOUND = 0.08;
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

/** How far a market has drifted from its saved revenue after `tick` ticks. A pure function of both inputs. */
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
 * `units` move; everything else is the saved data. Tick 0 is the saved data itself. Each market's given
 * figures for the latest month (revenue, growth, attainment, share) and its status are recomputed from the
 * moved facts with the published rule, which is the only place the app derives a market's status.
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
  const moved: Dataset = { ...ds, series };

  const sums = ds.markets.map((m) => ({
    m,
    t: totals(factsFor(moved, { entity: { kind: "market", marketId: m.id }, periods: [latest] })),
  }));
  const portfolio = sums.reduce((n, s) => n + s.t.actual, 0);

  const markets: Market[] = sums.map(({ m, t }) => {
    const attainment = attainmentPct(t);
    const growth = growthPct(t);
    return {
      ...m,
      kpis: {
        ...m.kpis,
        revenue: t.actual,
        growthPct: growth,
        forecastAttainmentPct: attainment,
        sharePct: round1((t.actual / portfolio) * 100),
        status: statusForDerived(attainment, growth),
      },
    };
  });
  return { ...moved, markets };
}
