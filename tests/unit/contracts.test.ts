import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import raw from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { AlertRuleSchema } from "@/domain/alerts";
import { parseDataset } from "@/domain/dataset";
import { ChatRequestSchema, FixturesFileSchema } from "@/domain/stream";

import { parseSseLine } from "./sse";

const clone = () => structuredClone(raw) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("DatasetSchema", () => {
  it("parses data.json with the expected shape", () => {
    const ds = parseDataset(raw);
    expect(ds.regions).toHaveLength(4);
    expect(ds.markets).toHaveLength(13);
    expect(ds.products).toHaveLength(5);
    expect(ds.meta.periods).toHaveLength(24);
    expect(ds.series).toHaveLength(1560);
    expect(ds.meta.latestPeriod).toBe("2026-05");
  });

  it("rejects a market whose region does not exist", () => {
    const bad = clone();
    bad.markets[0].regionId = "xx";
    try {
      parseDataset(bad);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const paths = (e as ZodError).issues.map((i) => i.path.join("."));
      expect(paths).toContain("markets.0.regionId");
    }
  });

  it("rejects a fact whose priorYear disagrees with the earlier actual", () => {
    const bad = clone();
    const idx = bad.series.findIndex((f: { period: string }) => f.period === "2025-08");
    bad.series[idx].priorYear += 1;
    expect(() => parseDataset(bad)).toThrow(/priorYear/);
  });

  it("rejects periods that are not consecutive months in ascending order", () => {
    const bad = clone();
    [bad.meta.periods[3], bad.meta.periods[4]] = [bad.meta.periods[4], bad.meta.periods[3]];
    expect(() => parseDataset(bad)).toThrow(/consecutive months/);
  });

  it("rejects a prior-year figure of zero, which growth divides by", () => {
    const bad = clone();
    bad.series[0].priorYear = 0;
    expect(() => parseDataset(bad)).toThrow();
  });
});

describe("SseEventSchema on the wire", () => {
  it("parses a token event", () => {
    expect(parseSseLine('data: {"type":"token","value":"Three "}')).toEqual({
      type: "token",
      value: "Three ",
    });
  });
  it("returns null for blank lines and comments", () => {
    expect(parseSseLine("")).toBeNull();
    expect(parseSseLine(": ping")).toBeNull();
  });
  it("throws on an unknown event type", () => {
    expect(() => parseSseLine('data: {"type":"nope"}')).toThrow();
  });
});

describe("AlertRuleSchema", () => {
  const rule = (metric: "growth" | "attainment", threshold: number) => ({
    metric,
    comparator: "below" as const,
    threshold,
    scope: "portfolio" as const,
  });
  it("rejects attainment above 100 with the specified message", () => {
    const r = AlertRuleSchema.safeParse(rule("attainment", 120));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Enter a value between 0 and 100.");
  });
  it("rejects growth below -100", () => {
    const r = AlertRuleSchema.safeParse(rule("growth", -150));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Enter a value between −100 and 100.");
  });
  it("accepts the boundaries", () => {
    expect(AlertRuleSchema.safeParse(rule("growth", -100)).success).toBe(true);
    expect(AlertRuleSchema.safeParse(rule("attainment", 0)).success).toBe(true);
  });
});

describe("ChatRequestSchema", () => {
  it("accepts the starter shape, a question alone", () => {
    expect(ChatRequestSchema.parse({ question: "Which markets are at risk?" })).toEqual({
      question: "Which markets are at risk?",
    });
  });

  it("accepts a question with the view it was asked from", () => {
    const body = {
      question: "Why did revenue dip?",
      context: { entity: { kind: "market", marketId: "de" }, period: "2026-03" },
    };
    expect(ChatRequestSchema.parse(body)).toEqual(body);
  });

  it("rejects an unknown region, a bad month and a missing question", () => {
    const entity = { kind: "region", regionId: "mars" };
    expect(() =>
      ChatRequestSchema.parse({ question: "q", context: { entity, period: "2026-03" } }),
    ).toThrow();
    expect(() =>
      ChatRequestSchema.parse({
        question: "q",
        context: { entity: { kind: "portfolio" }, period: "March" },
      }),
    ).toThrow();
    expect(() => ChatRequestSchema.parse({})).toThrow();
  });
});

describe("fixtures.json", () => {
  it("matches FixturesFileSchema, scopes and templates included", () => {
    const file = FixturesFileSchema.parse(fixtures);
    expect(file.fixtures.find((f) => f.id === "at-risk-europe")?.scope).toEqual({
      entity: "region",
      regionId: "eu",
    });
    expect(file.fixtures.find((f) => f.id === "dip-any-market")?.template).toBe("market-month");
  });
});
