import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import raw from "@/data/data.json";
import { AlertRuleSchema, parseDataset, parseSseLine } from "@/domain";

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
});

describe("parseSseLine", () => {
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
