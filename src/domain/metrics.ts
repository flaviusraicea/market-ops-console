import type { Basis, Dataset, Entity, Fact, Period, Provenance, Status, Totals } from "./dataset";
import { periodIndex, periodsForBasis, previousPeriod } from "./periods";
import { factsFor, marketsIn } from "./scope";

const round1 = (x: number) => Math.round(x * 10) / 10;

export function totals(facts: Fact[]): Totals {
  const t: Totals = { actual: 0, forecast: 0, priorYear: 0, units: 0, factCount: facts.length };
  for (const f of facts) {
    t.actual += f.actual;
    t.forecast += f.forecast;
    t.priorYear += f.priorYear;
    t.units += f.units;
  }
  return t;
}

export function attainmentPct(t: Totals): number {
  if (t.forecast === 0) throw new RangeError("Forecast is 0");
  return round1((t.actual / t.forecast) * 100);
}

export function growthPct(t: Totals): number {
  if (t.priorYear === 0) throw new RangeError("Prior year is 0");
  return round1((t.actual / t.priorYear - 1) * 100);
}

export function variance(t: Totals): number {
  return Math.round(t.actual - t.forecast);
}

/** Change from one month's revenue to the next, percent with one decimal. */
export function changePct(current: number, before: number): number {
  return round1((current / before - 1) * 100);
}

export function momChangePct(ds: Dataset, entity: Entity, period: Period): number | undefined {
  const prev = previousPeriod(ds, period);
  if (!prev) return undefined;
  const cur = totals(factsFor(ds, { entity, periods: [period] })).actual;
  const before = totals(factsFor(ds, { entity, periods: [prev] })).actual;
  return changePct(cur, before);
}

/** Units sold against the same month a year earlier, percent with one decimal; undefined in the first year of data. */
export function unitsYoyPct(ds: Dataset, entity: Entity, period: Period): number | undefined {
  const i = periodIndex(ds, period);
  const earlier = i >= 12 ? ds.meta.periods[i - 12] : undefined;
  if (!earlier) return undefined;
  const cur = totals(factsFor(ds, { entity, periods: [period] })).units;
  const before = totals(factsFor(ds, { entity, periods: [earlier] })).units;
  return before > 0 ? changePct(cur, before) : undefined;
}

export function kpiFor(
  ds: Dataset,
  entity: Entity,
  period: Period,
  basis: Basis,
): {
  totals: Totals;
  attainmentPct: number;
  growthPct: number;
  variance: number;
  provenance: Provenance;
} {
  const periods = periodsForBasis(ds, basis, period);
  const t = totals(factsFor(ds, { entity, periods }));
  if (entity.kind === "market" && basis === "month" && period === ds.meta.latestPeriod) {
    const market = ds.markets.find((m) => m.id === entity.marketId);
    if (market) {
      return {
        totals: { ...t, actual: market.kpis.revenue },
        attainmentPct: market.kpis.forecastAttainmentPct,
        growthPct: market.kpis.growthPct,
        variance: Math.round(market.kpis.revenue - t.forecast),
        provenance: "source",
      };
    }
  }
  return {
    totals: t,
    attainmentPct: attainmentPct(t),
    growthPct: growthPct(t),
    variance: variance(t),
    provenance: "derived",
  };
}

/**
 * data.json states each market's attainment twice for the latest month: `kpis` (reported) and the sum of its
 * `series` facts. They differ by up to 1.1 points for all 13 markets, and neither is changed. The reported figure
 * leads (tiles, verdict, badges, narrative); a sum is shown where a sum is the point (footers, heat cells) with
 * this pair beside it. Undefined when the two agree at one decimal, or when no reported figure exists for the
 * view (any other month, portfolio, region, product).
 */
export function attainmentPair(
  ds: Dataset,
  marketId: string,
  period: Period,
): { series: number; reported: number } | undefined {
  if (period !== ds.meta.latestPeriod) return undefined;
  const market = ds.markets.find((m) => m.id === marketId);
  if (!market) return undefined;
  const series = attainmentPct(
    totals(factsFor(ds, { entity: { kind: "market", marketId }, periods: [period] })),
  );
  const reported = market.kpis.forecastAttainmentPct;
  if (series === reported) return undefined;
  return { series, reported };
}

export function statusCounts(ds: Dataset, entity: Entity): Record<Status, number> {
  const counts: Record<Status, number> = { on_track: 0, at_risk: 0, off_track: 0 };
  for (const m of marketsIn(ds, entity)) counts[m.kpis.status] += 1;
  return counts;
}

export function attentionCount(ds: Dataset, entity: Entity): number {
  const c = statusCounts(ds, entity);
  return c.at_risk + c.off_track;
}
