import { AlertRuleSchema, type AlertRule } from "@/domain";
import type { NextRequest } from "next/server";

import { DEFAULT_ROLE, ROLE_COOKIE, canEditAlerts, parseRole } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A mock backend: it validates, waits and can fail on request, but stores nothing. The browser keeps the
// rules (src/features/alerts/storage.ts), so every serverless instance gives the same answer.

const LATENCY_MS = 600;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Executives read alert rules; only an Analyst changes them. */
const forbidden = (req: NextRequest) =>
  canEditAlerts(parseRole(req.cookies.get(ROLE_COOKIE)?.value) ?? DEFAULT_ROLE)
    ? null
    : json({ error: "read_only_role", message: "Rules are read-only for Executives." }, 403);

const shouldFail = (req: Request) => new URL(req.url).searchParams.get("fail") === "1";

export async function POST(req: NextRequest) {
  const denied = forbidden(req);
  if (denied) return denied;
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

  const rule: AlertRule = {
    ...parsed.data,
    id: parsed.data.id ?? crypto.randomUUID(),
    createdAt: parsed.data.createdAt ?? new Date().toISOString(),
  };
  return json({ rule });
}

export async function DELETE(req: NextRequest) {
  const denied = forbidden(req);
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ message: "Missing id", issues: [] }, 400);

  await sleep(LATENCY_MS);
  if (shouldFail(req)) return json({ message: "Delete failed (simulated)" }, 500);

  return new Response(null, { status: 204 });
}
