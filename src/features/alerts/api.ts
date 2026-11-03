import { AlertRuleSchema, type AlertRule } from "@/domain";
import { readRules, ruleKey, writeRules } from "./storage";

type Options = { fail?: boolean };

const withFail = (url: string, fail?: boolean) =>
  fail ? `${url}${url.includes("?") ? "&" : "?"}fail=1` : url;

/** The route refused because the signed-in role is an Executive. Retrying cannot succeed. */
export class ReadOnlyRoleError extends Error {
  constructor() {
    super("Rules are read-only for Executives.");
    this.name = "ReadOnlyRoleError";
  }
}

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
  if (res.status === 403 && body?.error === "read_only_role") return new ReadOnlyRoleError();
  return new Error(body?.message ?? `Request failed (${res.status})`);
}

/** Rules come from this browser's storage; see `storage.ts`. */
export async function listRules(): Promise<AlertRule[]> {
  return readRules();
}

export async function saveRule(rule: AlertRule, { fail }: Options = {}): Promise<AlertRule> {
  const res = await fetch(withFail("/api/alerts", fail), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw await failure(res);
  const body = (await res.json()) as { rule?: unknown };
  const confirmed = AlertRuleSchema.parse(body.rule);
  // The route only validates and simulates latency; this browser keeps the rule. Same metric and scope updates in place.
  const rules = readRules();
  const i = rules.findIndex((r) => ruleKey(r) === ruleKey(confirmed));
  const existing = rules[i];
  const stored: AlertRule = existing
    ? { ...confirmed, id: existing.id, createdAt: existing.createdAt }
    : confirmed;
  writeRules(existing ? rules.map((r, j) => (j === i ? stored : r)) : [...rules, stored]);
  return stored;
}

export async function deleteRule(id: string, { fail }: Options = {}): Promise<void> {
  const res = await fetch(withFail(`/api/alerts?id=${encodeURIComponent(id)}`, fail), {
    method: "DELETE",
  });
  if (!res.ok) throw await failure(res);
  writeRules(readRules().filter((r) => r.id !== id));
}

export type AlertApi = {
  listRules: typeof listRules;
  saveRule: typeof saveRule;
  deleteRule: typeof deleteRule;
};
export const alertApi: AlertApi = { listRules, saveRule, deleteRule };
