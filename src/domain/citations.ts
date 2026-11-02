import type { Dataset, Entity, Period, Status } from "./dataset";
import { latestPeriod, periodIndex } from "./periods";
import { entityName } from "./scope";
import type { Citation } from "./stream";

export type ResolvedTarget = {
  entity: Entity;
  period: Period;
  label: string;
  periodDefaulted: boolean;
};
export type Resolution =
  | { ok: true; target: ResolvedTarget; disagreement?: { assistant: string; source: Status } }
  | {
      ok: false;
      reason: "unknown_market" | "unknown_region" | "unknown_product" | "unknown_period";
      label: string;
    };

const CLAIMS: Array<{ re: RegExp; phrase: string; status: Status }> = [
  { re: /off[ -]track/i, phrase: "off track", status: "off_track" },
  { re: /at risk/i, phrase: "at risk", status: "at_risk" },
  { re: /on track/i, phrase: "on track", status: "on_track" },
];

export function resolveCitation(ds: Dataset, c: Citation, claimText?: string): Resolution {
  const fail = (reason: Extract<Resolution, { ok: false }>["reason"]): Resolution => ({
    ok: false,
    reason,
    label: c.label ?? "",
  });

  if (c.marketId && !ds.markets.some((m) => m.id === c.marketId)) return fail("unknown_market");
  if (c.regionId && !ds.regions.some((r) => r.id === c.regionId)) return fail("unknown_region");
  if (c.productId && !ds.products.some((p) => p.id === c.productId)) return fail("unknown_product");
  if (c.period && periodIndex(ds, c.period) < 0) return fail("unknown_period");

  let entity: Entity;
  if (c.marketId && c.productId)
    entity = { kind: "product", marketId: c.marketId, productId: c.productId };
  else if (c.marketId) entity = { kind: "market", marketId: c.marketId };
  else if (c.regionId)
    entity = { kind: "region", regionId: ds.regions.find((r) => r.id === c.regionId)!.id };
  else entity = { kind: "portfolio" };

  const periodDefaulted = c.period === undefined;
  const target: ResolvedTarget = {
    entity,
    period: c.period ?? latestPeriod(ds),
    label: c.label ?? entityName(ds, entity),
    periodDefaulted,
  };

  if (claimText && entity.kind === "market") {
    const hit = CLAIMS.find((x) => x.re.test(claimText));
    const market = ds.markets.find((m) => m.id === entity.marketId);
    if (hit && market && hit.status !== market.kpis.status) {
      return {
        ok: true,
        target,
        disagreement: { assistant: hit.phrase, source: market.kpis.status },
      };
    }
  }
  return { ok: true, target };
}
