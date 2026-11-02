import { describe, expect, it } from "vitest";

import {
  attainmentDiverging,
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
    [-5, "--div-n2"],
    [-0.1, "--div-n2"],
    [0.0, "--div-0"],
    [0.05, "--div-0"],
    [1.5, "--div-n1"],
    [2, "--div-p1"],
    [5, "--div-p1"],
    [10, "--div-p2"],
    [18.2, "--div-p3"],
  ])("%s → %s", (value, token) => {
    expect(growthDiverging(value)).toBe(token);
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
