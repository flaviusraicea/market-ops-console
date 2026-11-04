import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { evaluateRule } from "@/domain/alertRule";
import { parseDataset } from "@/domain/dataset";

const ds = parseDataset(raw);
const names = (r: { breaching: { name: string }[] }) => r.breaching.map((m) => m.name);

describe("evaluateRule", () => {
  it("attainment below 95 in Europe", () => {
    const r = evaluateRule(ds, {
      metric: "attainment",
      comparator: "below",
      threshold: 95,
      scope: { regionId: "eu" },
    });
    expect(names(r)).toEqual(["Germany", "Italy", "United Kingdom"]);
    expect(r.total).toBe(5);
  });
  it("growth below 0 across the portfolio", () => {
    const r = evaluateRule(ds, {
      metric: "growth",
      comparator: "below",
      threshold: 0,
      scope: "portfolio",
    });
    expect(names(r)).toEqual(["Germany", "Spain"]);
  });
  it("a single market that does not breach", () => {
    const r = evaluateRule(ds, {
      metric: "attainment",
      comparator: "below",
      threshold: 90,
      scope: { marketId: "de" },
    });
    expect(r.breaching).toEqual([]);
    expect(r.total).toBe(1);
  });
});
