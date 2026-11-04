import { describe, expect, it } from "vitest";

import { regionScaleMax } from "@/features/overview/viewModel";

describe("regionScaleMax", () => {
  it("is 120 % while every region is at or below it", () => {
    expect(regionScaleMax([95.4, 101, 104.9, 98])).toBe(120);
    expect(regionScaleMax([120])).toBe(120);
  });

  it("rounds a region above 120 % up to the next 10", () => {
    expect(regionScaleMax([96, 121.2])).toBe(130);
    expect(regionScaleMax([140])).toBe(140);
  });

  it("is 120 % with no rows", () => {
    expect(regionScaleMax([])).toBe(120);
  });
});
