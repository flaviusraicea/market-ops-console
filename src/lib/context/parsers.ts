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
export function parseAsPeriod(meta: ConsoleMeta) {
  return createParser<string>({
    parse: (v) => clampPeriodTo(meta, v),
    serialize: (v) => v,
  }).withDefault(meta.latestPeriod);
}

/** `mode` in the URL; absent means the signed-in role's view, and the pre-rename `overview` reads as `executive`. */
export function parseAsMode(defaultMode: Mode) {
  return createParser<Mode>({ parse: parseMode, serialize: (v) => v }).withDefault(defaultMode);
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
    facts:
      first(searchParams.facts) === "true" || first(searchParams.facts) === "1" ? true : undefined,
  };
  return normalizeContext(metaFromDataset(ds, defaultMode), raw);
}
