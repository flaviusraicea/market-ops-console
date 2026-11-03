import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/chat/route";
import { ChatContextSchema, parseSseLine, type SseEvent } from "@/domain";
import fixtures from "@/data/fixtures.json";

/** Posts to the route and returns the streamed answer text and its closing event. */
async function ask(body: unknown) {
  const res = await POST(
    new Request("http://test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  const raw = await res.text();
  const events = raw
    .split("\n\n")
    .map((block) => parseSseLine(block))
    .filter((e): e is SseEvent => e !== null);
  const text = events.flatMap((e) => (e.type === "token" ? [e.value] : [])).join("");
  const done = events.find((e) => e.type === "done");
  return { res, text, done };
}

const fixtureText = (id: string) => fixtures.fixtures.find((f) => f.id === id)?.answer.text;

const AT_RISK = "Which markets are at risk?";
const europe = ChatContextSchema.parse({
  entity: { kind: "region", regionId: "eu" },
  period: "2026-05",
});

describe("/api/chat follows the view the question was asked from", () => {
  it("answers an at-risk question at Europe scope with the Europe fixture", async () => {
    const { text, done } = await ask({ question: AT_RISK, context: europe });
    expect(text).toBe(fixtureText("at-risk-europe"));
    expect(done?.type === "done" && done.citations.map((c) => c.marketId)).toEqual([
      "de",
      "es",
      "it",
      "gb",
      "fr",
    ]);
  });

  it("answers the same question with no context as before", async () => {
    const { text } = await ask({ question: AT_RISK });
    expect(text).toBe(fixtureText("at-risk"));
  });

  it("answers the same question at portfolio scope as before", async () => {
    const { text } = await ask({
      question: AT_RISK,
      context: { entity: { kind: "portfolio" }, period: "2026-05" },
    });
    expect(text).toBe(fixtureText("at-risk"));
  });

  it("falls back to the general answer in a market inside Europe", async () => {
    const { text } = await ask({
      question: AT_RISK,
      context: { entity: { kind: "market", marketId: "de" }, period: "2026-05" },
    });
    expect(text).toBe(fixtureText("at-risk"));
  });

  it("fills the dip template from data.json for the market and month in view", async () => {
    const { text, done } = await ask({
      question: "Why did revenue dip?",
      context: { entity: { kind: "market", marketId: "de" }, period: "2026-03" },
    });
    expect(text).toBe(
      "Germany's revenue in Mar 2026 was $1.21M against a $1.31M forecast, 92.2% attainment; −27.2% on the previous month.",
    );
    expect(done).toMatchObject({
      kind: "normal",
      confidence: "medium",
      citations: [
        { marketId: "de", period: "2026-03", label: "Germany, Mar 2026" },
        { marketId: "de", period: "2026-02", label: "Germany, Feb 2026" },
      ],
    });
  });

  it("leaves the clause out in the first month, which has no previous one", async () => {
    const { text, done } = await ask({
      question: "Why did revenue dip?",
      context: { entity: { kind: "market", marketId: "de" }, period: "2024-06" },
    });
    expect(text).toMatch(/^Germany's revenue in Jun 2024 was .* attainment\.$/);
    expect(done?.type === "done" && done.citations).toHaveLength(1);
  });

  it("keeps the curated Germany answer when the question names the market", async () => {
    const { text } = await ask({
      question: "Why did Germany's revenue dip in March 2026?",
      context: { entity: { kind: "market", marketId: "de" }, period: "2026-03" },
    });
    expect(text).toBe(fixtureText("germany-dip"));
  });

  it("does not use a market template outside a market view", async () => {
    const { text } = await ask({
      question: "Why did revenue dip?",
      context: { entity: { kind: "portfolio" }, period: "2026-05" },
    });
    expect(text).toBe(fixtures.default.answer.text);
  });

  it("rejects a body that is not a chat request", async () => {
    const { res } = await ask({ context: europe });
    expect(res.status).toBe(400);
  });
});
