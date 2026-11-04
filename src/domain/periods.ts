import type { Basis, Dataset, Period } from "./dataset";

/** The one definition of a period string, shared by PeriodSchema and the zod-free stream guard. */
export const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Narrows a string from a chart callback to a Period. Same rule as PeriodSchema, without the schema library. */
export function toPeriod(value: string): Period {
  if (!PERIOD_PATTERN.test(value)) throw new Error(`Not a period: ${value}`);
  return value as Period;
}

export function latestPeriod(ds: Dataset): Period {
  return ds.meta.latestPeriod;
}

export function periodIndex(ds: Dataset, p: string): number {
  return ds.meta.periods.findIndex((x) => x === p);
}

export function previousPeriod(ds: Dataset, p: Period): Period | undefined {
  const i = periodIndex(ds, p);
  return i > 0 ? ds.meta.periods[i - 1] : undefined;
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

/** MAT needs twelve months of data; before that the basis in effect is Month. */
export function effectiveBasis(ds: Dataset, basis: Basis, period: Period): Basis {
  return basis === "mat" && periodIndex(ds, period) < 11 ? "month" : basis;
}
