import type { AlertRule } from "../contracts/alert";
import type { Dataset, Market } from "../contracts/data";
import type { Entity } from "../model/types";
import { marketsIn } from "../selectors/scope";

function scopeEntity(scope: AlertRule["scope"]): Entity {
  if (scope === "portfolio") return { kind: "portfolio" };
  if ("regionId" in scope) return { kind: "region", regionId: scope.regionId };
  return { kind: "market", marketId: scope.marketId };
}

export function evaluateRule(ds: Dataset, rule: AlertRule): { breaching: Market[]; total: number } {
  const inScope = marketsIn(ds, scopeEntity(rule.scope));
  const value = (m: Market) =>
    rule.metric === "growth" ? m.kpis.growthPct : m.kpis.forecastAttainmentPct;
  return {
    breaching: inScope
      .filter((m) => value(m) < rule.threshold)
      .sort((a, b) => a.name.localeCompare(b.name)),
    total: inScope.length,
  };
}
