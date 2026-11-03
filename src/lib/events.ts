import type { Context } from "@/domain";
import type { ErrorReport, ErrorSource } from "@/domain/errors";

export type { ErrorReport, ErrorSource };

export type ConsoleEvent =
  | { type: "navigate"; ctx: Context }
  | { type: "widget_error"; widget: string; message: string }
  | { type: "invalid_context"; message: string }
  | { type: "ask"; question: string }
  | { type: "alert_save_failed"; message: string }
  | { type: "error"; report: ErrorReport };

export type LoggedEvent = ConsoleEvent & { at: number };

const MAX = 200;
const log: LoggedEvent[] = [];

export function logEvent(e: ConsoleEvent): void {
  log.push({ ...e, at: Date.now() });
  if (log.length > MAX) log.shift();
  if (process.env.NODE_ENV !== "production") console.debug("[event]", e);
}

export function getEventLog(): readonly LoggedEvent[] {
  return log;
}

/** Where the browser sends reports in production (src/app/api/errors/route.ts writes them to the server log). */
export const ERROR_ENDPOINT = "/api/errors";
const STACK_LINES = 6;
const MAX_REPORTS_PER_PAGE = 20;
const DEDUPE_MS = 10_000;

const recent = new Map<string, number>();
let sent = 0;

// Field limits match ErrorReportSchema, so a long message is cut here rather than rejected by the endpoint.
function describe(error: unknown): { name: string; message: string; stack?: string } {
  const cut = (name: string, message: string, stack?: string) => ({
    name: name.slice(0, 60),
    message: (message || "Unknown error").slice(0, 500),
    ...(stack ? { stack: stack.slice(0, 2000) } : {}),
  });
  if (error instanceof Error) {
    const stack = error.stack?.split("\n").slice(0, STACK_LINES).join("\n");
    return cut(error.name, error.message, stack);
  }
  if (typeof error === "string") return cut("Error", error);
  try {
    return cut("Error", JSON.stringify(error) ?? String(error));
  } catch {
    return cut("Error", String(error));
  }
}

/**
 * The one place a failure is reported. It builds a structured record, keeps it in the event log, writes it as a
 * single JSON line to the console (so a log drain can parse it) and, in production in the browser, beacons it to
 * /api/errors, which writes the same line to the server log. The same error is reported once per ten seconds and
 * a page sends at most twenty, so a render loop cannot flood the endpoint. Never throws.
 */
export function reportError(
  error: unknown,
  where: { source: ErrorSource; widget?: string; route?: string } = { source: "window" },
): ErrorReport {
  const report: ErrorReport = {
    level: "error",
    source: where.source,
    ...describe(error),
    ...(where.widget ? { widget: where.widget } : {}),
    ...(where.route ? { route: where.route } : {}),
    ...(typeof window !== "undefined" ? { path: window.location.pathname } : {}),
    at: new Date().toISOString(),
  };
  try {
    logEvent({ type: "error", report });

    const key = `${report.source}|${report.widget ?? report.route ?? ""}|${report.name}|${report.message}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUPE_MS) return report;
    // Forget what has aged out, so the map is bounded by what happened in the last ten seconds.
    for (const [k, t] of recent) if (now - t >= DEDUPE_MS) recent.delete(k);
    recent.set(key, now);

    console.error(JSON.stringify(report));
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      sent < MAX_REPORTS_PER_PAGE
    ) {
      sent += 1;
      navigator.sendBeacon(ERROR_ENDPOINT, JSON.stringify(report));
    }
  } catch {
    // Reporting must never be the thing that fails.
  }
  return report;
}

/** Test hook: forget the dedupe window and the per-page count. */
export function resetErrorReporting(): void {
  recent.clear();
  sent = 0;
}
