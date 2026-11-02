import { AlertRuleSchema, type AlertRule } from "@/domain";

type Options = { fail?: boolean };

const withFail = (url: string, fail?: boolean) =>
  fail ? `${url}${url.includes("?") ? "&" : "?"}fail=1` : url;

async function failure(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return new Error(body?.message ?? `Request failed (${res.status})`);
}

export async function listRules(): Promise<AlertRule[]> {
  const res = await fetch("/api/alerts", { cache: "no-store" });
  if (!res.ok) throw await failure(res);
  const body = (await res.json()) as { rules?: unknown };
  return AlertRuleSchema.array().parse(body.rules);
}

export async function saveRule(rule: AlertRule, { fail }: Options = {}): Promise<AlertRule> {
  const res = await fetch(withFail("/api/alerts", fail), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rule),
  });
  if (!res.ok) throw await failure(res);
  const body = (await res.json()) as { rule?: unknown };
  return AlertRuleSchema.parse(body.rule);
}

export async function deleteRule(id: string, { fail }: Options = {}): Promise<void> {
  const res = await fetch(withFail(`/api/alerts?id=${encodeURIComponent(id)}`, fail), {
    method: "DELETE",
  });
  if (!res.ok) throw await failure(res);
}

export type AlertApi = {
  listRules: typeof listRules;
  saveRule: typeof saveRule;
  deleteRule: typeof deleteRule;
};
export const alertApi: AlertApi = { listRules, saveRule, deleteRule };
