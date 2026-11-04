import { describe, expect, it } from "vitest";

import { PeriodSchema } from "@/domain/dataset";
import type { Answer } from "@/features/assistant/useAnswerMachine";
import { answeredMarkets } from "@/features/assistant/scopeNote";
import { ds } from "./helpers";

const may = PeriodSchema.parse("2026-05");
const cites = (...ids: string[]) =>
  ids.map((marketId) => ({
    citation: { marketId, period: may, label: marketId },
    resolution: { ok: true, target: { entity: { kind: "market", marketId }, period: may } },
  }));
const answer = (question: string, ...ids: string[]) =>
  ({
    status: "done",
    id: "a1",
    question,
    kind: "normal",
    confidence: "high",
    text: "",
    context: { entity: { kind: "market", marketId: "ca" }, period: may },
    citations: cites(...ids),
  }) as unknown as Answer;

describe("a question that names two markets", () => {
  const q = "Compare Germany and France";
  it("says nothing extra when both are answered", () => {
    expect(answeredMarkets(ds, answer(q, "de", "fr"))).toBeUndefined();
  });
  it("narrows the label and says which was not compared when one is answered", () => {
    expect(answeredMarkets(ds, answer(q, "de"))).toEqual({
      label: "Germany · May 2026",
      note: "Covers Germany; France not compared",
    });
  });
  it("leaves an answer that cites neither alone", () => {
    expect(answeredMarkets(ds, answer(q))).toBeUndefined();
  });
});
