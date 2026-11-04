import "./zod";
import { z } from "zod";

import { EntitySchema, PeriodSchema, RegionIdSchema } from "./dataset";
import { CONFIDENCES, SSE_KINDS } from "./sseGuard";

export const ConfidenceSchema = z.enum(CONFIDENCES);
export const KindSchema = z.enum(SSE_KINDS);
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

/** What the dashboard is showing when a question is asked. Optional on the wire, so the starter contract still holds. */
export const ChatContextSchema = z.object({ entity: EntitySchema, period: PeriodSchema });
/** The composer stops at 1,000 characters (features/assistant/Composer.tsx MAX_CHARS); the route holds the same line. */
export const MAX_QUESTION_CHARS = 1000;
export const ChatRequestSchema = z.object({
  question: z.string().max(MAX_QUESTION_CHARS),
  context: ChatContextSchema.optional(),
});
export type ChatContext = z.infer<typeof ChatContextSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** The view a canned answer is written for. A fixture without a scope fits any view. */
const FixtureScopeSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("portfolio") }),
  z.object({ entity: z.literal("region"), regionId: RegionIdSchema.optional() }),
  z.object({ entity: z.literal("market"), marketId: z.string().optional() }),
]);

/** One canned answer in fixtures.json. */
export const FixtureSchema = z.object({
  id: z.string(),
  keywords: z.array(z.string()).optional(),
  /** Every group needs at least one hit, so "apac" alone does not answer a question about APAC and Europe. */
  allOf: z.array(z.array(z.string())).optional(),
  /** For an answer written about one market: the months it covers. Outside them the data-filled template answers. */
  marketId: z.string().optional(),
  periods: z.array(PeriodSchema).optional(),
  scope: FixtureScopeSchema.optional(),
  /** Names the filler that writes `answer.text` and `answer.citations` from data.json and the request's view. */
  template: z.literal("market-month").optional(),
  kind: KindSchema,
  answer: z.object({
    text: z.string(),
    citations: z.array(CitationSchema),
    confidence: ConfidenceSchema,
  }),
  error: z.string().optional(),
});
export const FixturesFileSchema = z.object({
  default: FixtureSchema,
  fixtures: z.array(FixtureSchema),
});
export type Fixture = z.infer<typeof FixtureSchema>;
export type FixturesFile = z.infer<typeof FixturesFileSchema>;
