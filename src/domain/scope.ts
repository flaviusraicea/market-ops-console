import type { Context, ContextPatch, Dataset, Entity, Fact, Market, Scope } from "./dataset";

export function marketsIn(ds: Dataset, entity: Entity): Market[] {
  switch (entity.kind) {
    case "portfolio":
      return ds.markets;
    case "region":
      return ds.markets.filter((m) => m.regionId === entity.regionId);
    case "market":
    case "product":
      return ds.markets.filter((m) => m.id === entity.marketId);
  }
}

export function factsFor(ds: Dataset, scope: Scope): Fact[] {
  const periods = new Set<string>(scope.periods);
  const marketIds = new Set(marketsIn(ds, scope.entity).map((m) => m.id));
  const productId = scope.entity.kind === "product" ? scope.entity.productId : undefined;
  return ds.series.filter(
    (f) =>
      periods.has(f.period) &&
      marketIds.has(f.marketId) &&
      (productId === undefined || f.productId === productId),
  );
}

export function entityOf(ctx: Context): Entity {
  if (ctx.product && ctx.market)
    return { kind: "product", marketId: ctx.market, productId: ctx.product };
  if (ctx.market) return { kind: "market", marketId: ctx.market };
  if (ctx.region) return { kind: "region", regionId: ctx.region };
  return { kind: "portfolio" };
}

export function entityName(ds: Dataset, entity: Entity): string {
  switch (entity.kind) {
    case "portfolio":
      return "Portfolio";
    case "region":
      return ds.regions.find((r) => r.id === entity.regionId)?.name ?? entity.regionId;
    case "market":
      return ds.markets.find((m) => m.id === entity.marketId)?.name ?? entity.marketId;
    case "product": {
      const market = ds.markets.find((m) => m.id === entity.marketId)?.name ?? entity.marketId;
      const product = ds.products.find((p) => p.id === entity.productId)?.name ?? entity.productId;
      return `${market} · ${product}`;
    }
  }
}

export function breadcrumbTrail(
  ds: Dataset,
  ctx: Context,
): Array<{ label: string; ctx: ContextPatch }> {
  const trail: Array<{ label: string; ctx: ContextPatch }> = [
    { label: "Portfolio", ctx: { region: undefined, market: undefined, product: undefined } },
  ];
  if (ctx.region) {
    trail.push({
      label: entityName(ds, { kind: "region", regionId: ctx.region }),
      ctx: { region: ctx.region, market: undefined, product: undefined },
    });
  }
  if (ctx.market) {
    trail.push({
      label: entityName(ds, { kind: "market", marketId: ctx.market }),
      ctx: { region: ctx.region, market: ctx.market, product: undefined },
    });
  }
  if (ctx.market && ctx.product) {
    trail.push({
      label: ds.products.find((p) => p.id === ctx.product)?.name ?? ctx.product,
      ctx: { region: ctx.region, market: ctx.market, product: ctx.product },
    });
  }
  return trail;
}
