// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import { readRuleSummaries, subscribeToSummaries, summaryOf } from "@/features/alerts/summary";
import { STORAGE_KEY, resetMemory, writeRules } from "@/features/alerts/storage";

const rule = (metric: "growth" | "attainment", threshold: number, marketId = "de") => ({
  id: `${metric}-${marketId}`,
  metric,
  comparator: "below" as const,
  threshold,
  scope: { marketId },
  createdAt: "2026-11-04T00:00:00.000Z",
});

beforeEach(() => {
  window.localStorage.clear();
  resetMemory();
});

describe("summaryOf", () => {
  it("says No rules when there are none", () => {
    expect(summaryOf([])).toBe("No rules");
  });

  it("lists each distinct rule, growth first, with a real minus sign", () => {
    expect(
      summaryOf([
        { metric: "attainment", threshold: 95 },
        { metric: "growth", threshold: -2 },
      ]),
    ).toBe("2 rules · Growth < −2% · Attainment < 95%");
  });

  it("counts every rule but names a repeated threshold once", () => {
    expect(
      summaryOf([
        { metric: "growth", threshold: 5 },
        { metric: "growth", threshold: 5 },
      ]),
    ).toBe("2 rules · Growth < 5%");
  });
});

describe("readRuleSummaries", () => {
  it("reads metric and threshold and keeps the same array until storage changes", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([rule("growth", 5), { junk: 1 }]));
    const first = readRuleSummaries();
    expect(first.map((r) => [r.metric, r.threshold])).toEqual([["growth", 5]]);
    expect(readRuleSummaries()).toBe(first);
  });

  it("gives an empty list for corrupt storage", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readRuleSummaries()).toEqual([]);
  });

  it("hears a save in the same tab", () => {
    let calls = 0;
    const stop = subscribeToSummaries(() => calls++);
    writeRules([rule("attainment", 95)]);
    stop();
    expect(calls).toBe(1);
    expect(readRuleSummaries()).toHaveLength(1);
  });
});
