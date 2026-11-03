import type {
  Context,
  ContextPatch,
  Dataset,
  Mode,
  Metric,
  Basis,
  Period,
  RegionId,
} from "@/domain";
import { isRegionId } from "@/domain/regions";
import { oneOf } from "@/lib/oneOf";

/** The slice of the dataset the URL layer needs, safe to ship to the client. */
export type ConsoleMeta = {
  periods: readonly string[];
  latestPeriod: string;
  marketRegion: Readonly<Record<string, RegionId>>;
  productIds: readonly string[];
  /** The view a URL without `mode` opens on: it follows the signed-in role. */
  defaultMode: Mode;
};

export function metaFromDataset(ds: Dataset, defaultMode: Mode = "executive"): ConsoleMeta {
  return {
    periods: ds.meta.periods,
    latestPeriod: ds.meta.latestPeriod,
    marketRegion: Object.fromEntries(ds.markets.map((m) => [m.id, m.regionId])),
    productIds: ds.products.map((p) => p.id),
    defaultMode,
  };
}

export type RawContext = {
  region?: string | null | undefined;
  market?: string | null | undefined;
  product?: string | null | undefined;
  period?: string | null | undefined;
  mode?: string | null | undefined;
  metric?: string | null | undefined;
  basis?: string | null | undefined;
  cite?: number | null | undefined;
  facts?: boolean | null | undefined;
};

export const MODES = ["executive", "analyst"] as const;

/** Mode as a URL value. Links written before the rename say `overview`; they mean `executive`. */
export function parseMode(v: string | null | undefined): Mode | null {
  return oneOf(MODES, v === "overview" ? "executive" : v);
}
export const METRICS = ["attainment", "revenue", "growth"] as const;
export const BASES = ["month", "ytd", "mat"] as const;

export function clampPeriodTo(meta: ConsoleMeta, p: string | null | undefined): Period {
  return (p && meta.periods.includes(p) ? p : meta.latestPeriod) as Period;
}

const pick = <T extends string>(values: readonly T[], v: string | null | undefined, d: T): T =>
  oneOf(values, v) ?? d;

/** Turns whatever the URL held into a valid Context. Pure; shared by server and client. */
export function normalizeContext(meta: ConsoleMeta, raw: RawContext): Context {
  const ctx: Context = {
    period: clampPeriodTo(meta, raw.period),
    mode: parseMode(raw.mode) ?? meta.defaultMode,
    metric: pick<Metric>(METRICS, raw.metric, "attainment"),
    basis: pick<Basis>(BASES, raw.basis, "month"),
  };
  const market = raw.market && meta.marketRegion[raw.market] ? raw.market : undefined;
  if (market) {
    ctx.market = market;
    ctx.region = meta.marketRegion[market] as RegionId;
    if (raw.product && meta.productIds.includes(raw.product)) ctx.product = raw.product;
  } else {
    if (isRegionId(raw.region)) ctx.region = raw.region;
  }
  if (typeof raw.cite === "number" && Number.isInteger(raw.cite) && raw.cite >= 0)
    ctx.cite = raw.cite;
  if (raw.facts === true) ctx.facts = true;
  return ctx;
}

const HISTORY_KEYS = ["period", "region", "market", "product", "mode"] as const;

export type ContextChange =
  { ok: true; next: Context; history: "push" | "replace" } | { ok: false; reason: string };

/** Applies the URL invariants to a requested change. A key present with value undefined clears it. */
export function applyContextChange(
  meta: ConsoleMeta,
  current: Context,
  partial: ContextPatch,
): ContextChange {
  const merged: Context = { ...current };
  const has = (k: keyof Context) => Object.prototype.hasOwnProperty.call(partial, k);
  for (const k of Object.keys(partial) as Array<keyof Context>) {
    (merged as Record<string, unknown>)[k] = partial[k];
  }
  const out: Context = { ...merged };

  if (has("market") && partial.market) {
    const r = meta.marketRegion[partial.market];
    if (r) out.region = r;
  }
  if (has("region") && !partial.region) {
    delete out.region;
    delete out.market;
    delete out.product;
  }
  if (has("market") && !partial.market) delete out.product;
  if (out.product && !out.market) {
    return { ok: false, reason: "product requires a market" };
  }

  const changed = (Object.keys(partial) as Array<keyof Context>).some((k) => out[k] !== current[k]);
  const next = normalizeContext(meta, out as RawContext);
  if (!changed) return { ok: true, next, history: "replace" };
  const touchedNonCite = (Object.keys(out) as Array<keyof Context>)
    .concat(Object.keys(current) as Array<keyof Context>)
    .some((k) => k !== "cite" && out[k] !== current[k]);
  if (touchedNonCite && !has("cite")) delete next.cite;
  const history = HISTORY_KEYS.some((k) => out[k] !== current[k]) ? "push" : "replace";
  return { ok: true, next, history };
}

/** The dataset without its fact series: markets, regions, products and periods, enough to resolve citations. */
export function lightDataset(ds: Dataset): Dataset {
  return { ...ds, series: [] };
}
