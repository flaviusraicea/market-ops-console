import type { Context } from "@/domain";

export type ErrorSource = "boundary" | "window" | "promise";

/** One failure, flattened to JSON-safe fields so a log drain can index it. */
export type ErrorReport = {
  level: "error";
  source: ErrorSource;
  name: string;
  message: string;
  /** The first lines of the stack; the rest is noise in a log line. */
  stack?: string;
  /** Which widget's boundary caught it, for source "boundary". */
  widget?: string;
  /** The page the user was on, without the query string. */
  path?: string;
  at: string;
};

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

function describe(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    const stack = error.stack?.split("\n").slice(0, STACK_LINES).join("\n");
    return { name: error.name, message: error.message, ...(stack ? { stack } : {}) };
  }
  if (typeof error === "string") return { name: "Error", message: error };
  try {
    return { name: "Error", message: JSON.stringify(error) ?? String(error) };
  } catch {
    return { name: "Error", message: String(error) };
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
  where: { source: ErrorSource; widget?: string } = { source: "window" },
): ErrorReport {
  const report: ErrorReport = {
    level: "error",
    source: where.source,
    ...describe(error),
    ...(where.widget ? { widget: where.widget } : {}),
    ...(typeof window !== "undefined" ? { path: window.location.pathname } : {}),
    at: new Date().toISOString(),
  };
  try {
    logEvent({ type: "error", report });

    const key = `${report.source}|${report.widget ?? ""}|${report.name}|${report.message}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last !== undefined && now - last < DEDUPE_MS) return report;
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
