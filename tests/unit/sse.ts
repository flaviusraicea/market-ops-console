import { type SseEvent, SseEventSchema } from "@/domain/stream";

/** Parses one SSE line against the full schema. Null for blanks, comments and non-data lines; throws on bad JSON or a
 * schema failure. The browser reads the stream with the zod-free guard in src/domain/sseGuard.ts. */
export function parseSseLine(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith(":") || !trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  return SseEventSchema.parse(JSON.parse(payload));
}
