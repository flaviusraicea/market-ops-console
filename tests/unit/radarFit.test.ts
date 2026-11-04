import { describe, expect, it } from "vitest";

import { LABEL_AT, angleOf, fitRadius } from "@/components/charts/RadarMarks";

const five = (width: number) => Array.from({ length: 5 }, () => ({ width, lines: 1 }));

describe("fitRadius", () => {
  it("is the 120 px cap in a wide card", () => {
    expect(fitRadius({ width: 600, height: 340, labels: five(70) })).toBe(120);
  });

  it("shrinks in a narrow card so every side label ends inside the edge", () => {
    const width = 269;
    const labels = five(70);
    const r = fitRadius({ width, height: 340, labels });
    expect(r).toBeLessThan(120);
    labels.forEach(({ width: w }, a) => {
      const cos = Math.cos(angleOf(a, 5));
      const x = width / 2 + cos * r * LABEL_AT;
      if (cos >= 0.3) expect(x + w).toBeLessThanOrEqual(width - 8 + 1e-9);
      if (cos <= -0.3) expect(x - w).toBeGreaterThanOrEqual(8 - 1e-9);
    });
  });

  it("has no floor and never goes negative", () => {
    expect(fitRadius({ width: 120, height: 340, labels: five(90) })).toBe(0);
  });
});
