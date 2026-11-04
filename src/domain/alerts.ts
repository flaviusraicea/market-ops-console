import "./zod";
import { z } from "zod";

import { RegionIdSchema, type Dataset, type Entity, type Market } from "./dataset";
import { marketsIn } from "./scope";

export const AlertScopeSchema = z.union([
  z.literal("portfolio"),
  z.object({ regionId: RegionIdSchema }),
  z.object({ marketId: z.string() }),
]);

export const AlertRuleSchema = z
  .object({
    id: z.string().optional(),
    metric: z.enum(["growth", "attainment"]),
    comparator: z.literal("below"),
    threshold: z.number(),
    scope: AlertScopeSchema,
    createdAt: z.string().datetime().optional(),
  })
  .superRefine((r, ctx) => {
    if (r.metric === "attainment" && (r.threshold < 0 || r.threshold > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["threshold"],
        message: "Enter a value between 0 and 100.",
      });
    }
    if (r.metric === "growth" && (r.threshold < -100 || r.threshold > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["threshold"],
        message: "Enter a value between −100 and 100.",
      });
    }
  });

export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertScope = z.infer<typeof AlertScopeSchema>;

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
