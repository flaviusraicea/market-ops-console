// Rule helpers without TanStack Query, so the Alerts section's first paint can order rules the way the list will.
import type { AlertRule } from "@/domain";
import { scopeToValue } from "./labels";

export const DEFAULT_THRESHOLDS = { growth: 0, attainment: 95 } as const;

export const keyOf = (r: Pick<AlertRule, "metric" | "scope">) =>
  `${r.metric}:${scopeToValue(r.scope)}`;

const SCOPE_RANK = { portfolio: 0, region: 1, market: 2 } as const;

/**
 * One row per metric and scope, in a fixed order: All markets, regions, then markets, each growth before
 * attainment. Whatever order or duplicates the server sends, the list reads the same.
 */
export function normalizeRules<T extends AlertRule>(rows: readonly T[]): T[] {
  const byKey = new Map<string, T>();
  for (const r of rows) byKey.set(keyOf(r), r);
  const rank = (r: AlertRule) => {
    const v = scopeToValue(r.scope);
    return [
      SCOPE_RANK[v.split(":")[0] as keyof typeof SCOPE_RANK],
      v,
      r.metric === "growth" ? 0 : 1,
    ] as const;
  };
  return [...byKey.values()].sort((a, b) => {
    const [ka, va, ma] = rank(a);
    const [kb, vb, mb] = rank(b);
    return ka - kb || va.localeCompare(vb) || ma - mb;
  });
}
