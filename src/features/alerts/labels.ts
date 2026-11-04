import type { AlertRule, AlertScope, Dataset } from "@/domain";

const MINUS = "−";

export const METRIC_LABEL: Record<AlertRule["metric"], string> = {
  growth: "Growth",
  attainment: "Attainment",
};

/** The scope as a select value: `portfolio`, `region:eu` or `market:de`. */
export function scopeToValue(scope: AlertScope): string {
  if (scope === "portfolio") return "portfolio";
  return "regionId" in scope ? `region:${scope.regionId}` : `market:${scope.marketId}`;
}

export function scopeFromValue(value: string): AlertScope {
  const [kind, id = ""] = value.split(":");
  if (kind === "region") return { regionId: id } as AlertScope;
  if (kind === "market") return { marketId: id };
  return "portfolio";
}

function scopeLabel(ds: Dataset, scope: AlertScope): string {
  if (scope === "portfolio") return "All markets";
  if ("regionId" in scope)
    return ds.regions.find((r) => r.id === scope.regionId)?.name ?? scope.regionId;
  return ds.markets.find((m) => m.id === scope.marketId)?.name ?? scope.marketId;
}

/** A threshold as the reader says it: real minus sign, no trailing zeros. */
export function formatThreshold(n: number): string {
  return `${String(n).replace("-", MINUS)}%`;
}

/** `Growth below 0% · Europe` */
export function ruleSentence(ds: Dataset, rule: AlertRule): string {
  return `${METRIC_LABEL[rule.metric]} below ${formatThreshold(rule.threshold)} · ${scopeLabel(ds, rule.scope)}`;
}

/** What evaluating the rule against the latest figures says. */
export function evaluationLine(names: readonly string[]): string {
  if (names.length === 0) return "No markets breach this rule";
  const noun = names.length === 1 ? "1 market breaches" : `${names.length} markets breach`;
  return `${noun} this rule: ${names.join(", ")}`;
}
