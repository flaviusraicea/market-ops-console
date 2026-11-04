import type { Context } from "@/domain";
import type { CONTEXT_KEYS } from "./parsers";
import { first, hasInvalidContextParams, urlValue, type SearchParams } from "./parsers";

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
