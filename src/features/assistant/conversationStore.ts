import { CONVERSATION_KEY as KEY } from "@/lib/conversation";
import type { Answer } from "./useAnswerMachine";

/** The tab's conversation is kept so a reload does not lose it: per tab (sessionStorage), cleared on sign-out. */

/** An answer as stored: a stream cut short by the reload is kept as what it now is, a stopped partial answer. */
type Stored = Exclude<Answer, { status: "streaming" }>;

function toStored(a: Answer): Stored {
  const origin = {
    id: a.id,
    question: a.question,
    ...(a.about ? { about: a.about } : {}),
    ...(a.asked ? { asked: a.asked } : {}),
  };
  // A restored card does not replay the retry fade, and a stream cut short is kept as a stopped partial answer.
  switch (a.status) {
    case "streaming":
      return { ...origin, status: "stopped", text: a.text };
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
        citations: a.citations,
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

export function loadConversation(): Answer[] {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStored);
  } catch {
    return [];
  }
}

const STATUSES = new Set(["done", "stopped", "failed"]);

/** Shape check for what comes back from storage: an id, a question, text and a finished status. */
function isStored(v: unknown): v is Stored {
  if (typeof v !== "object" || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.question === "string" &&
    typeof a.text === "string" &&
    typeof a.status === "string" &&
    STATUSES.has(a.status) &&
    (a.status !== "done" || Array.isArray(a.citations))
  );
}
