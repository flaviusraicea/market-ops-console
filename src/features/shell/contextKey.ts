import type { Context } from "@/domain";

/**
 * The part of a Context a widget's data depends on, as one string: the `resetKey` of its ErrorBoundary. A server
 * component computes it, so it lives apart from the boundary's client module.
 */
export function contextKey(ctx: Context): string {
  return [ctx.region, ctx.market, ctx.product, ctx.period, ctx.metric, ctx.basis, ctx.facts]
    .map((v) => v ?? "")
    .join("|");
}
