import type { ContextPatch, Dataset, ResolvedTarget } from "@/domain";

/** Maps a resolved citation to the Context patch that shows it. Keys set to undefined clear that part of the URL. */
export function targetToContext(
  target: ResolvedTarget,
  ds: Pick<Dataset, "markets">,
): ContextPatch {
  const { entity, period } = target;
  switch (entity.kind) {
    case "portfolio":
      return { region: undefined, market: undefined, product: undefined, period };
    case "region":
      return { region: entity.regionId, market: undefined, product: undefined, period };
    case "market":
      return {
        region: ds.markets.find((m) => m.id === entity.marketId)?.regionId,
        market: entity.marketId,
        product: undefined,
        period,
      };
    case "product":
      return {
        region: ds.markets.find((m) => m.id === entity.marketId)?.regionId,
        market: entity.marketId,
        product: entity.productId,
        period,
      };
  }
}
