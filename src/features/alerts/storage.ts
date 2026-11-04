import { type AlertRule } from "@/domain";
import { AlertRuleSchema } from "@/domain/alerts";
import { scopeToValue } from "./labels";
import { RULES_CHANGED, STORAGE_KEY } from "./storageKey";

export { STORAGE_KEY };

/** Used when localStorage is unavailable or full, so rules still last for the session. */
let memory: AlertRule[] = [];

export const ruleKey = (r: Pick<AlertRule, "metric" | "scope">) =>
  `${r.metric}:${scopeToValue(r.scope)}`;

/** Reads the saved rules. Corrupt or unreadable data gives an empty list; invalid entries are dropped. */
export function readRules(): AlertRule[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return memory;
  }
  if (raw === null) return memory;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      const r = AlertRuleSchema.safeParse(item);
      return r.success ? [r.data] : [];
    });
  } catch {
    return [];
  }
}

export function writeRules(rules: AlertRule[]): void {
  memory = rules;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // Disabled or full: the in-memory copy above keeps the session working.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RULES_CHANGED));
}

/** Calls `onChange` when another tab changes the saved rules. Returns the unsubscribe. */
export function subscribeToRules(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Test helper. */
export function resetMemory(): void {
  memory = [];
}
