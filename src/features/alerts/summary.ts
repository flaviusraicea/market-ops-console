// The folded Alerts row reads the saved rules without the form's code: no zod, no TanStack Query. It parses them with
// the same hand-written check as storage.ts, so the row counts exactly the rules the list will show.
import type { AlertRule } from "@/domain";
import { parseAlertRule } from "@/domain/alertRule";
import { METRIC_LABEL, formatThreshold } from "./labels";
import { RULES_CHANGED, STORAGE_KEY } from "./storageKey";

export type RuleSummary = Pick<AlertRule, "metric" | "threshold">;

let lastRaw: string | null | undefined;
let lastRules: readonly AlertRule[] = [];

/** The saved rules that parse. The same array comes back until storage changes. */
export function readRuleSummaries(): readonly AlertRule[] {
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
    lastRules = Array.isArray(parsed)
      ? parsed.flatMap((item) => {
          const rule = parseAlertRule(item);
          return rule ? [rule] : [];
        })
      : [];
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

// Whether the open section's last read of the rules failed. The form reports it, so the folded row can say
// "Couldn’t load rules" instead of a count it cannot trust, without loading the form's code itself.
let loadFailed = false;
const loadListeners = new Set<() => void>();

export function setRulesLoadFailed(next: boolean) {
  if (next === loadFailed) return;
  loadFailed = next;
  for (const l of loadListeners) l();
}

export const readRulesLoadFailed = () => loadFailed;

export function subscribeToLoadFailed(onChange: () => void): () => void {
  loadListeners.add(onChange);
  return () => loadListeners.delete(onChange);
}
