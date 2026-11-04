import { describe, expect, it } from "vitest";

import { fitRadius } from "@/components/charts/RadarChart";
import { SHORT_LABEL_BELOW, labelLines } from "@/components/charts/RadarMarks";

const AXES = ["Attainment", "Growth YoY", "Revenue share (derived)", "Month on month", "Units YoY"];

describe("radar axis labels", () => {
  it("draws one short name per axis in a narrow card", () => {
    expect(AXES.map((a) => labelLines(a, true))).toEqual([
      ["Attain"],
      ["Growth"],
      ["Rev share"],
      ["MoM"],
      ["Units"],
    ]);
  });

  it("keeps the full names, split over two lines when long, in a wide card", () => {
    expect(labelLines("Month on month", false)).toEqual(["Month on", "month"]);
    expect(labelLines("Attainment", false)).toEqual(["Attainment"]);
  });

  it("switches on the card's width: short below 304 px, full from 304 px", () => {
    expect(fitRadius(SHORT_LABEL_BELOW - 1, AXES)).toBeGreaterThan(
      fitRadius(SHORT_LABEL_BELOW - 1, AXES, false),
    );
    expect(fitRadius(SHORT_LABEL_BELOW, AXES)).toBe(fitRadius(SHORT_LABEL_BELOW, AXES, false));
  });
});
