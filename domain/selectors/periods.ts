import type { Dataset, Period } from "../contracts/data";
import type { Basis } from "../model/types";

export function latestPeriod(ds: Dataset): Period {
  return ds.meta.latestPeriod;
}

export function horizon(ds: Dataset): Period {
  return latestPeriod(ds);
}

export function periodIndex(ds: Dataset, p: string): number {
  return ds.meta.periods.findIndex((x) => x === p);
}

export function previousPeriod(ds: Dataset, p: Period): Period | undefined {
  const i = periodIndex(ds, p);
  return i > 0 ? ds.meta.periods[i - 1] : undefined;
}

export function clampPeriod(ds: Dataset, p: string): Period {
  const i = periodIndex(ds, p);
  return i >= 0 ? (ds.meta.periods[i] as Period) : latestPeriod(ds);
}

export function periodsForBasis(ds: Dataset, basis: Basis, endPeriod: Period): Period[] {
  const end = periodIndex(ds, endPeriod);
  if (end < 0) throw new RangeError(`Unknown period ${endPeriod}`);
  if (basis === "month") return [endPeriod];
  if (basis === "ytd") {
    const year = endPeriod.slice(0, 4);
    return ds.meta.periods.filter((p, i) => i <= end && p.startsWith(`${year}-`));
  }
  if (end < 11) throw new RangeError("MAT needs 12 periods");
  return ds.meta.periods.slice(end - 11, end + 1);
}
