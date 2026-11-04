// The folded Alerts row reads the saved rules without the form's code: no zod, no TanStack Query. It only needs
// each rule's metric and threshold, so anything else in storage is ignored here and validated by the form later.
import { RULES_CHANGED, STORAGE_KEY } from "./storageKey";
import { METRIC_LABEL, formatThreshold } from "./labels";

export type RuleSummary = { metric: keyof typeof METRIC_LABEL; threshold: number };

const isSummary = (x: unknown): x is RuleSummary => {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    (r["metric"] === "growth" || r["metric"] === "attainment") &&
    typeof r["threshold"] === "number" &&
    Number.isFinite(r["threshold"])
  );
};

let lastRaw: string | null | undefined;
let lastRules: readonly RuleSummary[] = [];

/** The saved rules' metric and threshold. The same array comes back until storage changes. */
export function readRuleSummaries(): readonly RuleSummary[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw === lastRaw) return lastRules;
  lastRaw = raw;
  try {
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    lastRules = Array.isArray(parsed) ? parsed.filter(isSummary) : [];
  } catch {
    lastRules = [];
  }
  return lastRules;
}

/**
 * One line for the folded section: "No rules", or the count and each distinct rule,
 * "2 rules · Growth < 5% · Attainment < 95%".
 */
export function summaryOf(rules: readonly RuleSummary[]): string {
  if (rules.length === 0) return "No rules";
  const order = { growth: 0, attainment: 1 } as const;
  const parts = [
    ...new Set(
      [...rules]
        .sort((a, b) => order[a.metric] - order[b.metric] || a.threshold - b.threshold)
        .map((r) => `${METRIC_LABEL[r.metric]} < ${formatThreshold(r.threshold)}`),
    ),
  ];
  return `${rules.length} ${rules.length === 1 ? "rule" : "rules"} · ${parts.join(" · ")}`;
}

/** Calls `onChange` when the rules change in this tab or another. Returns the unsubscribe. */
export function subscribeToSummaries(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(RULES_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RULES_CHANGED, onChange);
  };
}
