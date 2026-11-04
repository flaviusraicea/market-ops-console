import { resolveCitation, type Dataset } from "@/domain";
import { CONVERSATION_KEY as KEY } from "@/lib/conversation";
import { claimTextFor } from "./inlineMap";
import type { StoredAnswer } from "@/domain/storedConversation";
import type { Answer } from "./useAnswerMachine";

/** The tab's conversation is kept so a reload does not lose it: per tab (sessionStorage), cleared on sign-out. */

/** An answer as stored: a stream cut short by the reload is kept as what it now is, a stopped partial answer. */
function toStored(a: Answer): StoredAnswer {
  const origin = {
    id: a.id,
    question: a.question,
    ...(a.about ? { about: a.about } : {}),
    ...(a.context ? { context: a.context } : {}),
    ...(a.slot ? { slot: a.slot } : {}),
  };
  // A restored card does not replay the retry fade, and a stream cut short is kept as a stopped partial answer.
  switch (a.status) {
    case "streaming":
    case "stopped":
      return { ...origin, status: "stopped", text: a.text };
    case "failed":
      return { ...origin, status: "failed", text: a.text, message: a.message };
    case "done":
      return {
        ...origin,
        status: "done",
        text: a.text,
        kind: a.kind,
        confidence: a.confidence,
        citations: a.citations.map((c) => c.citation),
      };
  }
}

export function saveConversation(answers: readonly Answer[]): void {
  try {
    if (answers.length === 0) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, JSON.stringify(answers.map(toStored)));
  } catch {
    // Storage blocked or full: the conversation still lasts until reload.
  }
}

/** A stored answer back in the list, its citations resolved against the dataset as they were when it arrived. */
function toAnswer(ds: Dataset, a: StoredAnswer): Answer {
  // Optional fields the schema read as absent are left out, not set to undefined (exactOptionalPropertyTypes).
  const { about, context, slot, ...rest } = a;
  const origin = {
    ...rest,
    ...(about ? { about } : {}),
    ...(context ? { context } : {}),
    ...(slot ? { slot } : {}),
  };
  if (origin.status !== "done") return origin;
  return {
    ...origin,
    citations: origin.citations.map((citation, i) => ({
      citation,
      resolution: resolveCitation(ds, citation, claimTextFor(origin.text, origin.citations, i)),
    })),
  };
}

/**
 * What the tab stored, checked against the stored shape (domain/storedConversation.ts) before anything renders it. The
 * schema and its library load only when there is something to restore, so a fresh tab pays nothing.
 */
export async function loadConversation(ds: Dataset): Promise<Answer[]> {
  let parsed: unknown;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const { parseStoredConversation } = await import("@/domain/storedConversation");
  return parseStoredConversation(parsed).map((a) => toAnswer(ds, a));
}
