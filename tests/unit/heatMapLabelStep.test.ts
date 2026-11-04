import { describe, expect, it } from "vitest";

import { monthLabelStep } from "@/components/charts/HeatMap";

describe("monthLabelStep", () => {
  it("labels every third month when a label and its gap fit in three columns and the last pair fits in four", () => {
    expect(monthLabelStep(25, 42)).toBe(3);
  });

  it("steps to six when the last pair would touch at three", () => {
    // 3 × 18 − 42 = 12 clears, but 4 × 18 − 84 < 8 for the right-aligned last label.
    expect(monthLabelStep(18, 42)).toBe(6);
  });

  it("falls back to once a year when even six is too tight", () => {
    expect(monthLabelStep(10, 42)).toBe(12);
  });
});
