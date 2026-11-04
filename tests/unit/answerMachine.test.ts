import { describe, expect, it } from "vitest";

import data from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { parseDataset } from "@/domain/dataset";
import { CitationSchema } from "@/domain/stream";
import {
  answerReducer,
  historyReducer,
  type Answer,
  type AnswerState,
} from "@/features/assistant/useAnswerMachine";

const ds = parseDataset(data);
const dip = fixtures.fixtures.find((f) => f.id === "germany-dip")!;
const dipCitations = dip.answer.citations.map((c) => CitationSchema.parse(c));
const idle: AnswerState = { status: "idle" };

function streaming(text = ""): AnswerState {
  return answerReducer(
    answerReducer(idle, {
      type: "ASK",
      id: "a1",
      question: "Why did Germany dip?",
      controller: new AbortController(),
    }),
    { type: "TOKEN_FLUSH", text },
  );
}

describe("answerReducer", () => {
  it("idle -> ASK -> streaming with empty text", () => {
    const s = answerReducer(idle, {
      type: "ASK",
      id: "a1",
      question: "Why did Germany dip?",
      controller: new AbortController(),
    });
    expect(s).toMatchObject({
      status: "streaming",
      id: "a1",
      question: "Why did Germany dip?",
      text: "",
    });
  });

  it("TOKEN_FLUSH appends", () => {
    let s = streaming("Three ");
    s = answerReducer(s, { type: "TOKEN_FLUSH", text: "markets " });
    expect(s).toMatchObject({ status: "streaming", text: "Three markets " });
  });

  it("DONE resolves the three Germany-dip citations", () => {
    const s = answerReducer(streaming(dip.answer.text), {
      type: "DONE",
      kind: "normal",
      confidence: "high",
      citations: dipCitations,
      ds,
    });
    expect(s.status).toBe("done");
    if (s.status !== "done") return;
    expect(s.kind).toBe("normal");
    expect(s.confidence).toBe("high");
    expect(s.citations).toHaveLength(3);
    expect(s.citations.every((c) => c.resolution.ok)).toBe(true);
  });

  it("STOP from streaming keeps the text and drops the controller", () => {
    const s = answerReducer(streaming("Germany's "), { type: "STOP" });
    expect(s).toEqual({
      status: "stopped",
      id: "a1",
      question: "Why did Germany dip?",
      text: "Germany's ",
    });
  });

  it("ignores late tokens after STOP", () => {
    const stopped = answerReducer(streaming("a"), { type: "STOP" });
    expect(answerReducer(stopped, { type: "TOKEN_FLUSH", text: "b" })).toBe(stopped);
  });

  it("ERROR with no text -> failed", () => {
    const s = answerReducer(streaming(""), { type: "ERROR", message: "boom" });
    expect(s).toMatchObject({ status: "failed", text: "", message: "boom" });
  });

  it("RETRY from stopped -> streaming with the same question", () => {
    const stopped = answerReducer(streaming("x"), { type: "STOP" });
    const s = answerReducer(stopped, {
      type: "RETRY",
      id: "a2",
      controller: new AbortController(),
    });
    expect(s).toMatchObject({
      status: "streaming",
      id: "a2",
      question: "Why did Germany dip?",
      text: "",
    });
  });
});

describe("historyReducer", () => {
  it("RETRY puts the re-asked answer in the stopped one's place, with no second question", () => {
    const c = () => new AbortController();
    let list: Answer[] = [];
    list = historyReducer(list, {
      id: "a1",
      action: { type: "ASK", id: "a1", question: "q", controller: c() },
    });
    list = historyReducer(list, { id: "a1", action: { type: "TOKEN_FLUSH", text: "part" } });
    list = historyReducer(list, { id: "a1", action: { type: "STOP" } });
    list = historyReducer(list, { id: "a1", action: { type: "RETRY", id: "a2", controller: c() } });
    expect(list.map((a) => [a.id, a.status])).toEqual([["a2", "streaming"]]);
    expect(list[0]).toMatchObject({ question: "q", text: "", retried: true });
  });
});
