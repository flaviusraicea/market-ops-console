import { AlertRuleSchema, type AlertRule } from "@/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory store, one per server instance. A real product would persist rules per user.
// Kept on globalThis so a dev hot reload does not empty it.
const globalStore = globalThis as typeof globalThis & { __alertRules?: Map<string, AlertRule> };
const store = (globalStore.__alertRules ??= new Map<string, AlertRule>());

const LATENCY_MS = 600;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (body: unknown, status = 200) => Response.json(body, { status });

const shouldFail = (req: Request) => new URL(req.url).searchParams.get("fail") === "1";

/** A rule is identified by what it watches, so saving the same metric and scope again updates it. */
const ruleKey = (r: Pick<AlertRule, "metric" | "scope">) =>
  `${r.metric}:${JSON.stringify(r.scope)}`;

export async function GET() {
  return json({ rules: [...store.values()] });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ message: "Body must be JSON", issues: [] }, 400);
  }
  const parsed = AlertRuleSchema.safeParse(body);
  if (!parsed.success) {
    return json({ message: "Invalid alert rule", issues: parsed.error.issues }, 400);
  }

  await sleep(LATENCY_MS);
  if (shouldFail(req)) return json({ message: "Save failed (simulated)" }, 500);

  const existing = [...store.values()].find((r) => ruleKey(r) === ruleKey(parsed.data));
  const rule: AlertRule = {
    ...parsed.data,
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  store.set(rule.id as string, rule);
  return json({ rule });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ message: "Missing id", issues: [] }, 400);

  await sleep(LATENCY_MS);
  if (shouldFail(req)) return json({ message: "Delete failed (simulated)" }, 500);

  store.delete(id);
  return new Response(null, { status: 204 });
}
