import { describe, expect, it } from "vitest";

import { anomalyLabelPlacement } from "@/components/charts/LineParts";

describe("anomalyLabelPlacement", () => {
  it("sits 12 px under the lowest of the three lines when the plot has room", () => {
    // y grows downwards: 150 is the lowest line on screen.
    const p = anomalyLabelPlacement({ x: 300, y: 150 }, [150, 120, 130], 260, 1);
    expect(p.top).toBe(false);
    expect(p.baseline).toBe(150 + 12 + 12);
    // From 2 px under the 4 px marker to the label's top-left corner, 4 px above the text box.
    expect(p.leader).toEqual({ x1: 300, y1: 156, x2: 308, y2: 158 });
  });

  it("goes 12 px above the highest line when there is no room below, the leader joining marker and label", () => {
    const p = anomalyLabelPlacement({ x: 300, y: 240 }, [240, 200, 210], 260, 1);
    expect(p.top).toBe(true);
    const boxTop = 200 - 12 - 16;
    expect(p.baseline).toBe(boxTop + 12);
    // From 2 px above the marker to the label's bottom-left corner, 4 px under the text box.
    expect(p.leader).toEqual({ x1: 300, y1: 234, x2: 308, y2: boxTop + 16 + 4 });
  });

  it("ends at the bottom-right corner when the label opens to the left", () => {
    const p = anomalyLabelPlacement({ x: 600, y: 240 }, [240, 200, 210], 260, -1);
    expect(p.leader.x2).toBe(592);
  });

  it("is held inside the plot when the highest line is near the top", () => {
    const p = anomalyLabelPlacement({ x: 300, y: 250 }, [250, 5, 8], 260, 1);
    expect(p.top).toBe(true);
    expect(p.baseline).toBe(12);
  });
});
