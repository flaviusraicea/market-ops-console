// Zod-free half of the stream contract. The browser reads the event stream with this guard so the zod core
// (about 26 KB gzipped) stays out of the first bundle; the schemas in stream.ts remain the contract for the
// server route (asserted in development) and the tests, which keep this guard in step with them.

import { PERIOD_PATTERN } from "./periods";
import type { SseEvent } from "./stream";

// The values of the stream enums, written once here and used by the zod schemas in stream.ts.
export const SSE_KINDS = ["normal", "low_confidence", "abstain", "error"] as const;
export const CONFIDENCES = ["high", "medium", "low"] as const;
/** The longest question: the composer stops there and the route (ChatRequestSchema) rejects anything longer. */
export const MAX_QUESTION_CHARS = 1000;
const KINDS: readonly string[] = SSE_KINDS;
const LEVELS: readonly string[] = CONFIDENCES;
const CITATION_KEYS = ["marketId", "regionId", "productId", "label"] as const;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function isCitation(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const { period } = v;
  if (period !== undefined && !(typeof period === "string" && PERIOD_PATTERN.test(period)))
    return false;
  return CITATION_KEYS.every((k) => v[k] === undefined || typeof v[k] === "string");
}

/** True when `value` has the shape of one of the three stream events (token, done, error). */
export function isSseEvent(value: unknown): value is SseEvent {
  if (!isRecord(value)) return false;
  switch (value["type"]) {
    case "token":
      return typeof value["value"] === "string";
    case "error":
      return typeof value["message"] === "string";
    case "done": {
      const { kind, confidence, citations } = value;
      return (
        typeof kind === "string" &&
        KINDS.includes(kind) &&
        typeof confidence === "string" &&
        LEVELS.includes(confidence) &&
        Array.isArray(citations) &&
        citations.every(isCitation)
      );
    }
    default:
      return false;
  }
}

/** Parses one SSE line for the browser. Null for blanks, comments and non-data lines; throws on bad JSON or shape. */
export function parseSseLineLite(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith(":") || !trimmed.startsWith("data:")) return null;
  const parsed: unknown = JSON.parse(trimmed.slice("data:".length).trim());
  if (!isSseEvent(parsed)) throw new Error("Unreadable stream event");
  return parsed;
}
