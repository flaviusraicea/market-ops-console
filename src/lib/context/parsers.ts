import { createParser, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server";

import type { Context, Dataset, Mode } from "@/domain";
import {
  BASES,
  METRICS,
  clampPeriodTo,
  metaFromDataset,
  normalizeContext,
  parseMode,
  type ConsoleMeta,
  type RawContext,
} from "./invariants";

/** `facts=1` in the URL; absent otherwise. */
const parseAsFlag = createParser<boolean>({
  parse: (v) => (v === "1" ? true : null),
  serialize: () => "1",
});

const REGIONS = ["na", "eu", "apac", "latam"] as const;

/** Validates against meta.periods and clamps unknown values to the latest period. */
function parseAsPeriod(meta: ConsoleMeta) {
  return createParser<string>({
    parse: (v) => clampPeriodTo(meta, v),
    serialize: (v) => v,
  }).withDefault(meta.latestPeriod);
}

/**
 * `mode` in the URL. Absent still reads as the signed-in role's view (and the pre-rename `overview` as
 * `executive`), but it is never cleared on write: an address someone copies always names the view it shows.
 */
export function parseAsMode(defaultMode: Mode) {
  return createParser<Mode>({ parse: parseMode, serialize: (v) => v })
    .withDefault(defaultMode)
    .withOptions({ clearOnDefault: false });
}

export function contextParsers(meta: ConsoleMeta) {
  return {
    region: parseAsStringEnum([...REGIONS]),
    market: parseAsString,
    product: parseAsString,
    period: parseAsPeriod(meta),
    mode: parseAsMode(meta.defaultMode),
    metric: parseAsStringEnum([...METRICS]).withDefault("attainment"),
    basis: parseAsStringEnum([...BASES]).withDefault("month"),
    cite: parseAsInteger,
    facts: parseAsFlag,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Server-side parse with the same rules as the client hook. */
export function parseContextFromSearchParams(
  ds: Dataset,
  searchParams: SearchParams,
  defaultMode: Mode = "executive",
): Context {
  const cite = first(searchParams.cite);
  const raw: RawContext = {
    region: first(searchParams.region),
    market: first(searchParams.market),
    product: first(searchParams.product),
    period: first(searchParams.period),
    mode: first(searchParams.mode),
    metric: first(searchParams.metric),
    basis: first(searchParams.basis),
    cite: cite !== undefined && /^\d+$/.test(cite) ? Number(cite) : undefined,
    facts: first(searchParams.facts) === "1" ? true : undefined,
  };
  return normalizeContext(metaFromDataset(ds, defaultMode), raw);
}

const CONTEXT_KEYS = [
  "region",
  "market",
  "product",
  "period",
  "mode",
  "metric",
  "basis",
  "cite",
  "facts",
] as const satisfies readonly (keyof Context)[];

/** How a Context field reads in the URL; `facts` is the flag `1`. */
function urlValue(ctx: Context, key: (typeof CONTEXT_KEYS)[number]): string | undefined {
  const value = ctx[key];
  if (value === undefined) return undefined;
  if (key === "facts") return value ? "1" : undefined;
  return String(value);
}

/**
 * True when a Context parameter in the URL did not survive parsing: an unknown market, a period outside the data,
 * a product without its market. The page then replaces the address with the one it is actually showing, so the
 * URL stays the single source of truth. Parameters it adds (a market's region, the mode) do not count.
 */
export function hasInvalidContextParams(searchParams: SearchParams, ctx: Context): boolean {
  return CONTEXT_KEYS.some((key) => {
    const raw = first(searchParams[key]);
    return raw !== undefined && raw !== urlValue(ctx, key);
  });
}

/** What a link's fallback says to the reader: the sentence, and where the view landed. */
export type ContextReset = { title: string; detail: string };

const RESET_LABEL: Partial<Record<(typeof CONTEXT_KEYS)[number], string>> = {
  region: "Unknown region",
  market: "Unknown market",
  product: "Unknown product",
  period: "Period outside the data",
  metric: "Unknown metric",
  basis: "Unknown basis",
  mode: "Unknown view",
};

/**
 * The notice for an address that did not survive parsing, or null when it did. One sentence for the first value
 * that fell back (the market, being the drill, before the rest): what was wrong and what the view shows instead.
 * `landed` names that view (a market, a region or "portfolio"), `period` is the month it shows, already formatted.
 */
export function describeContextReset(
  searchParams: SearchParams,
  ctx: Context,
  landed: { scope: string; period: string },
): ContextReset | null {
  if (!hasInvalidContextParams(searchParams, ctx)) return null;
  const key = (["market", "region", "period", "product", "metric", "basis", "mode"] as const).find(
    (k) => {
      const raw = first(searchParams[k]);
      return raw !== undefined && raw !== urlValue(ctx, k);
    },
  );
  const detail = "This link held a value the console doesn’t have";
  if (key === "market") return { title: `Unknown market reset to ${landed.scope}`, detail };
  if (key === "period")
    return { title: `Period outside the data reset to ${landed.period}`, detail };
  if (key === "product")
    return {
      title: "Product dropped",
      detail: ctx.market ? "Unknown product, showing all products" : "A product needs a market",
    };
  if (key) return { title: `${RESET_LABEL[key]} reset to its default`, detail };
  return { title: "Link adjusted", detail: "Some of its parameters were not recognised" };
}
