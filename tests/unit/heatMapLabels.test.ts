import { describe, expect, it } from "vitest";

import { monthLabelStep, monthLabels } from "@/components/charts/heatMapLabels";

/** The labelled columns in order, each with its alignment. */
const shown = (m: Map<number, string>) => [...m].sort((a, b) => a[0] - b[0]);

/** Left and right edge of each label, for a gap check. */
function gaps(m: Map<number, string>, pitch: number, column: number, label: number) {
  const spans = shown(m).map(([i, a]) =>
    a === "end" ? [i * pitch + column - label, i * pitch + column] : [i * pitch, i * pitch + label],
  );
  return spans.slice(1).map((s, k) => s[0]! - spans[k]![1]!);
}

describe("monthLabelStep", () => {
  it("labels every third month when a label and its gap fit in three columns", () => {
    expect(monthLabelStep(25, 42)).toBe(3);
  });
  it("steps to six, then twelve, as the columns narrow", () => {
    expect(monthLabelStep(15, 42)).toBe(6);
    expect(monthLabelStep(6, 42)).toBe(12);
  });
});

describe("monthLabels", () => {
  it("always labels the last month in view, ending at its column", () => {
    const m = monthLabels({ pitch: 25, column: 23, label: 42, last: 23 });
    expect(m.get(23)).toBe("end");
    expect(shown(m).map(([i]) => i)).toEqual([2, 5, 8, 11, 14, 17, 20, 23]);
  });

  it("keeps the step and drops only the label that would crowd the last one", () => {
    // 1024 docked: 6 × 11 − 42 clears, but the month six before the last would sit 7 px from it.
    const m = monthLabels({ pitch: 11, column: 9, label: 42, last: 18 });
    expect(m.has(18)).toBe(true);
    expect(m.has(12)).toBe(false);
    expect(m.has(6)).toBe(true);
    expect(Math.min(...gaps(m, 11, 9, 42))).toBeGreaterThanOrEqual(8);
  });

  it("counts back from the last month in view when the grid is scrolled back", () => {
    const m = monthLabels({ pitch: 25, column: 23, label: 42, last: 15 });
    expect(m.get(15)).toBe("end");
    expect(m.has(23)).toBe(false);
  });

  it("labels the selected month and keeps every gap at 8 px or more", () => {
    const m = monthLabels({ pitch: 25, column: 23, label: 42, last: 23 }, 9);
    expect(m.get(9)).toBe("start");
    expect(m.has(8)).toBe(false);
    expect(Math.min(...gaps(m, 25, 23, 42))).toBeGreaterThanOrEqual(8);
  });

  it("gives the selected month the label when it sits too close to the last for both", () => {
    const m = monthLabels({ pitch: 25, column: 23, label: 42, last: 23 }, 22);
    expect(m.get(22)).toBe("start");
    expect(m.has(23)).toBe(false);
  });
});
