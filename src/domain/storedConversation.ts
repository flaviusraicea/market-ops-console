import "./zod";
import { z } from "zod";

import { ChatContextSchema, CitationSchema, ConfidenceSchema, KindSchema } from "./stream";

/**
 * The shape of one answer in sessionStorage (features/assistant/conversationStore.ts), as the contract types it is
 * made of. Citations are stored as they
 * came off the wire; what the console derived from them (resolution, claim check) is computed again on restore
 * from the dataset, so a stored record never carries a derived value the current code might read differently.
 * An answer whose context no longer parses keeps its text and loses the context: a retry then asks about the portfolio.
 * This module loads only when there is a conversation to restore, so zod stays out of the first paint.
 */
const base = {
  id: z.string(),
  question: z.string(),
  text: z.string(),
  about: z.string().optional(),
  context: ChatContextSchema.optional().catch(undefined),
  slot: z.string().optional(),
};

export const StoredAnswerSchema = z.discriminatedUnion("status", [
  z.object({ ...base, status: z.literal("stopped") }),
  z.object({ ...base, status: z.literal("failed"), message: z.string() }),
  z.object({
    ...base,
    status: z.literal("done"),
    kind: KindSchema,
    confidence: ConfidenceSchema,
    citations: z.array(CitationSchema),
  }),
]);
export type StoredAnswer = z.infer<typeof StoredAnswerSchema>;

/** The stored answers that parse. Anything else in the list (an older shape, an edited entry) is dropped. */
export function parseStoredConversation(raw: unknown): StoredAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = StoredAnswerSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
