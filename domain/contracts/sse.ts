import { z } from "zod";

import { PeriodSchema } from "./data";

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const KindSchema = z.enum(["normal", "low_confidence", "abstain", "error"]);
export const CitationSchema = z.object({
  marketId: z.string().optional(),
  regionId: z.string().optional(),
  productId: z.string().optional(),
  period: PeriodSchema.optional(),
  label: z.string().optional(),
});
export const SseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({
    type: z.literal("done"),
    kind: KindSchema,
    citations: z.array(CitationSchema),
    confidence: ConfidenceSchema,
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type SseEvent = z.infer<typeof SseEventSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Kind = z.infer<typeof KindSchema>;

/** Parses one SSE line. Null for blanks, comments and non-data lines; throws on bad JSON or schema failure. */
export function parseSseLine(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith(":") || !trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  return SseEventSchema.parse(JSON.parse(payload));
}
