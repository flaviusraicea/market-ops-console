import { createSerializer } from "nuqs/server";

import type { ContextPatch } from "@/domain";
import type { ConsoleMeta } from "./invariants";
import { contextParsers } from "./parsers";

/**
 * Serialises a Context to a URL with the same parsers the page reads with, so a link and a
 * client-side write produce the same address. Defaults are omitted; key order is fixed as
 * region, market, product, period, mode, metric, basis, cite, facts.
 */
export function hrefFor(meta: ConsoleMeta, ctx: ContextPatch): string {
  const serialize = createSerializer(contextParsers(meta));
  return serialize("/", {
    region: ctx.region ?? null,
    market: ctx.market ?? null,
    product: ctx.product ?? null,
    ...(ctx.period ? { period: ctx.period } : {}),
    ...(ctx.mode ? { mode: ctx.mode } : {}),
    ...(ctx.metric ? { metric: ctx.metric } : {}),
    ...(ctx.basis ? { basis: ctx.basis } : {}),
    cite: ctx.cite ?? null,
    facts: ctx.facts ?? null,
  });
}
