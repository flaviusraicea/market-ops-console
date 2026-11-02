import type { Dataset, Fact, Period } from "../contracts/data";
import type { Basis, Entity, Provenance, Totals } from "../model/types";
import { periodsForBasis, previousPeriod } from "./periods";
import { factsFor } from "./scope";

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

export function momChangePct(ds: Dataset, entity: Entity, period: Period): number | undefined {
  const prev = previousPeriod(ds, period);
  if (!prev) return undefined;
  const cur = totals(factsFor(ds, { entity, periods: [period] })).actual;
  const before = totals(factsFor(ds, { entity, periods: [prev] })).actual;
  return round1((cur / before - 1) * 100);
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
