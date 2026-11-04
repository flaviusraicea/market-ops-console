// Zod-free, so the folded Alerts section can read saved rules and count breaches without loading the schema library.
// The schema in alerts.ts is the contract; tests/unit/alertRule.test.ts checks this parse agrees with it.
import type { AlertRule, AlertScope } from "./alerts";
import type { Dataset, Entity, Market } from "./dataset";
import { isRegionId } from "./regions";
import { marketsIn } from "./scope";

/** The range each metric's threshold must fall in, shared with the schema so the two cannot drift. */
export const THRESHOLD_RANGE = {
  attainment: { min: 0, max: 100, message: "Enter a value between 0 and 100." },
  growth: { min: -100, max: 100, message: "Enter a value between −100 and 100." },
} as const;

/**
 * What zod's `z.string().datetime()` accepts: UTC, seconds required, any fraction. The shape alone lets through
 * hour 25 or 30 February, so the date must also come back unchanged from `Date`.
 */
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const isIsoDateTime = (s: string) => {
  if (!ISO_DATETIME.test(s)) return false;
  const date = new Date(s);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 19) === s.slice(0, 19);
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function parseScope(v: unknown): AlertScope | null {
  if (v === "portfolio") return v;
  if (!isRecord(v)) return null;
  if (isRegionId(v["regionId"])) return { regionId: v["regionId"] };
  if (typeof v["marketId"] === "string") return { marketId: v["marketId"] };
  return null;
}

/** A stored or returned rule, checked field by field: the known fields of a valid rule, or null. */
export function parseAlertRule(v: unknown): AlertRule | null {
  if (!isRecord(v)) return null;
  const { id, metric, comparator, threshold, createdAt } = v;
  if (metric !== "growth" && metric !== "attainment") return null;
  if (comparator !== "below") return null;
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) return null;
  const range = THRESHOLD_RANGE[metric];
  if (threshold < range.min || threshold > range.max) return null;
  const scope = parseScope(v["scope"]);
  if (!scope) return null;
  if (id !== undefined && typeof id !== "string") return null;
  if (createdAt !== undefined && (typeof createdAt !== "string" || !isIsoDateTime(createdAt)))
    return null;
  return {
    ...(id === undefined ? {} : { id }),
    metric,
    comparator,
    threshold,
    scope,
    ...(createdAt === undefined ? {} : { createdAt }),
  };
}

function scopeEntity(scope: AlertScope): Entity {
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
