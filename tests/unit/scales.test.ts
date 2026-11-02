import { describe, expect, it } from "vitest";

import {
  attainmentDiverging,
  GROWTH_LEGEND,
  growthDiverging,
  revenueSequential,
} from "@/components/charts/scales";

describe("attainmentDiverging", () => {
  it.each([
    [92.0, "--div-n3"],
    [92.5, "--div-n2"],
    [96.4, "--div-n1"],
    [99.97, "--div-0"],
    [100.0, "--div-0"],
    [100.04, "--div-0"],
    [101.0, "--div-p1"],
    [102.0, "--div-p1"],
    [104.5, "--div-p2"],
    [105.0, "--div-p2"],
    [106.0, "--div-p3"],
  ])("%s → %s", (value, token) => {
    expect(attainmentDiverging(value)).toBe(token);
  });
});

describe("growthDiverging", () => {
  it.each([
    [-9.7, "--div-n3"],
    [-5.1, "--div-n3"],
    [-5, "--div-n2"],
    [-4.6, "--div-n2"],
    [-2, "--div-n1"],
    [-1.0, "--div-n1"],
    [-0.1, "--div-n1"],
    [-0.05, "--div-0"],
    [0, "--div-0"],
    [0.05, "--div-0"],
    [0.3, "--div-p1"],
    [2, "--div-p1"],
    [3.5, "--div-p2"],
    [5, "--div-p2"],
    [5.1, "--div-p3"],
    [18.2, "--div-p3"],
  ])("%s → %s", (value, token) => {
    expect(growthDiverging(value)).toBe(token);
  });

  it("never gives a non-negative value a negative colour, or the reverse", () => {
    for (let v = -20; v <= 20; v += 0.05) {
      const token = growthDiverging(Math.round(v * 100) / 100);
      if (v >= 0) expect(token).not.toMatch(/--div-n/);
      if (v <= 0) expect(token).not.toMatch(/--div-p/);
    }
  });
});

describe("GROWTH_LEGEND", () => {
  it("labels the seven symmetric bins", () => {
    expect(GROWTH_LEGEND.map((b) => b.label)).toEqual([
      "<−5%",
      "−5 to −2",
      "−2 to 0",
      "0",
      "0 to 2",
      "2 to 5",
      ">5%",
    ]);
  });
});

describe("revenueSequential", () => {
  it("uses seven equal bins of value / max", () => {
    expect(revenueSequential(0, 7)).toBe("--seq-1");
    expect(revenueSequential(0.99, 7)).toBe("--seq-1");
    expect(revenueSequential(1, 7)).toBe("--seq-2");
    expect(revenueSequential(6.5, 7)).toBe("--seq-7");
    expect(revenueSequential(7, 7)).toBe("--seq-7");
  });
});
