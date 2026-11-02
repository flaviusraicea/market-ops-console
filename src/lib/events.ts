import type { Context } from "@/domain";

export type ConsoleEvent =
  | { type: "navigate"; ctx: Context }
  | { type: "widget_error"; widget: string; message: string }
  | { type: "invalid_context"; message: string }
  | { type: "ask"; question: string };

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
