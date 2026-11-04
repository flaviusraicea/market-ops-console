import { describe, expect, it } from "vitest";

import { anomalyLabelPlacement } from "@/components/charts/LineParts";

describe("anomalyLabelPlacement", () => {
  it("sits 12 px under the lowest of the three lines when the plot has room", () => {
    // y grows downwards: 150 is the lowest line on screen.
    const p = anomalyLabelPlacement(150, [150, 120, 130], 260);
    expect(p.top).toBe(false);
    expect(p.baseline).toBe(150 + 12 + 12);
    expect(p.leader).toEqual([156, 164]);
  });

  it("goes 12 px above the highest line when there is no room below", () => {
    const p = anomalyLabelPlacement(240, [240, 200, 210], 260);
    expect(p.top).toBe(true);
    expect(p.baseline).toBe(200 - 12 - 16 + 12);
    expect(p.leader).toEqual([234, 226]);
  });

  it("is held inside the plot when the highest line is near the top", () => {
    const p = anomalyLabelPlacement(250, [250, 5, 8], 260);
    expect(p.top).toBe(true);
    expect(p.baseline).toBe(12);
  });
});
