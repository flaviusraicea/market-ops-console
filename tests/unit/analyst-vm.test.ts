import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { overviewVM } from "@/features/overview/viewModel";
import { RADAR_AXES_DERIVED, RADAR_AXES_GIVEN, analystVM } from "@/features/analyst/viewModel";

const ds = parseDataset(raw);
const base: Context = {
  period: "2026-05" as Period,
  mode: "analyst",
  metric: "attainment",
  basis: "month",
};
const europe: Context = { ...base, region: "eu" };
const germany: Context = { ...europe, market: "de" };

describe("analyst view model", () => {
  it("gridVM for Europe: five rows sorted by revenue, largest first, with the preview strings", () => {
    const grid = analystVM(ds, europe).grid;
    if (grid.kind !== "markets") throw new Error("expected market rows");
    expect(
      grid.rows.map((r) => [
        r.name,
        r.iso2,
        r.statusLabel,
        r.revenue,
        r.attainment,
        r.growth,
        r.share,
      ]),
    ).toEqual([
      ["United Kingdom", "GB", "At risk", "$2.07M", "94.3%", "+8.8%", "14.0%"],
      ["Germany", "DE", "Off track", "$1.68M", "92.0%", "−9.7%", "8.9%"],
      ["France", "FR", "At risk", "$1.61M", "96.4%", "+11.6%", "25.7%"],
      ["Italy", "IT", "At risk", "$0.94M", "93.0%", "+0.3%", "28.9%"],
      ["Spain", "ES", "Off track", "$0.76M", "104.5%", "−4.6%", "18.1%"],
    ]);
    expect(grid.title).toBe("Markets · Europe");
    expect(grid.rows.every((r) => r.trend.values.length === 24)).toBe(true);
    expect(grid.rows[1]?.trend.anomalyIndex).toBe(21);
    expect(grid.rows.map((r) => r.revenueValue)).toEqual(
      [...grid.rows.map((r) => r.revenueValue)].sort((a, b) => b - a),
    );
    expect(grid.rows.find((r) => r.id === "es")?.attainmentNote).toBe(
      "Off track despite 104.5% attainment. The status rule is not documented in the data; growth is −4.6%.",
    );
    expect(grid.rows.filter((r) => r.attainmentNote)).toHaveLength(1);
  });

  it("gridVM at the portfolio has all 13 markets", () => {
    const grid = analystVM(ds, base).grid;
    expect(grid.kind === "markets" && grid.rows).toHaveLength(13);
  });

  it("gridVM for Germany: five product rows with Veltrix $0.57M and 92.7%", () => {
    const grid = analystVM(ds, germany).grid;
    if (grid.kind !== "products") throw new Error("expected product rows");
    expect(grid.rows).toHaveLength(5);
    expect(grid.rows[0]?.name).toBe("Veltrix");
    expect(grid.caption).toContain("Sorted by revenue");
    const veltrix = grid.rows.find((r) => r.id === "veltrix");
    expect(veltrix?.revenue).toBe("$0.57M");
    expect(veltrix?.attainment).toBe("92.7%");
    const selected = analystVM(ds, { ...germany, product: "nuvora" }).grid;
    if (selected.kind !== "products") throw new Error("expected product rows");
    expect(selected.rows.filter((r) => r.selected).map((r) => r.id)).toEqual(["nuvora"]);
  });

  it("timeSeriesVM for Germany: 24 points, March 2026 actual, one anomaly", () => {
    const ts = analystVM(ds, germany).timeSeries;
    expect(ts.points).toHaveLength(24);
    expect(ts.points.find((p) => p.period === "2026-03")?.actual).toBe(1_211_930);
    expect(ts.anomalies).toHaveLength(1);
    expect(ts.anomalies[0]).toMatchObject({
      label: "−27% vs Feb",
      ariaLabel: "Anomaly: March 2026 revenue fell 27 percent versus February",
    });
    expect(ts.title).toBe("Germany · Revenue vs forecast vs prior year");
    expect(ts.desc).toContain("Line chart of Germany monthly revenue from June 2024 to May 2026.");
    expect(ts.desc).toContain("Actual below forecast in 24 of 24 months");
    expect(ts.desc).toContain("Table available via View as table.");
  });

  it("timeSeriesVM has no anomaly outside a market, and keeps Germany's on a product", () => {
    expect(analystVM(ds, europe).timeSeries.anomalies).toHaveLength(0);
    const veltrix = analystVM(ds, { ...germany, product: "veltrix" }).timeSeries;
    expect(veltrix.title).toBe("Germany · Veltrix · Revenue vs forecast vs prior year");
    expect(veltrix.anomalies).toHaveLength(1);
  });

  it("heatMapVM for Europe: 5 rows by 24 columns with known cells", () => {
    const hm = analystVM(ds, europe).heatMap;
    expect(hm.rows).toHaveLength(5);
    expect(hm.periods).toHaveLength(24);
    expect(hm.rows.every((r) => r.cells.length === 24)).toBe(true);
    const cell = (id: string, period: string) =>
      hm.rows.find((r) => r.id === id)?.cells.find((c) => c.period === period)?.value;
    expect(cell("de", "2026-04")).toBe(92.2);
    expect(cell("it", "2026-03")).toBe(92.8);
  });

  it("heatMapVM rows follow the grid's revenue order, at region and portfolio level", () => {
    for (const ctx of [europe, base]) {
      const vm = analystVM(ds, ctx);
      if (vm.grid.kind !== "markets") throw new Error("expected market rows");
      expect(vm.heatMap.rows.map((r) => r.id)).toEqual(vm.grid.rows.map((r) => r.id));
    }
    expect(analystVM(ds, europe).heatMap.caption).toContain("Sorted by revenue");
  });

  it("peers stay in view when a market is selected, and the selection is carried", () => {
    const hm = analystVM(ds, { ...germany, period: "2026-03" as Period }).heatMap;
    expect(hm.rows).toHaveLength(5);
    expect(hm.selected).toEqual({ market: "de", period: "2026-03" });
  });

  it("radarVM for Europe: five series on the given-share axes", () => {
    const radar = analystVM(ds, europe).radar;
    expect(radar.axes).toEqual(RADAR_AXES_GIVEN);
    expect(radar.axes).toEqual(["Attainment", "Growth", "Share (given)"]);
    expect(radar.series).toHaveLength(5);
    expect(radar.series.map((s) => s.name)).toEqual([
      "France",
      "Germany",
      "Italy",
      "Spain",
      "United Kingdom",
    ]);
    expect(radar.series.map((s) => s.color)).toEqual([
      "--cat-1",
      "--cat-2",
      "--cat-3",
      "--cat-4",
      "--cat-5",
    ]);
    for (let axis = 0; axis < 3; axis++) {
      const vals = radar.series.map((s) => s.values[axis]!);
      expect(Math.min(...vals)).toBe(0);
      expect(Math.max(...vals)).toBe(1);
    }
    expect(radar.series.find((s) => s.id === "de")?.raw).toEqual(["92.0%", "−9.7%", "8.9%"]);
  });

  it("radarVM at the portfolio: four regions and the derived third axis", () => {
    const radar = analystVM(ds, base).radar;
    expect(radar.series).toHaveLength(4);
    expect(radar.axes).toEqual(RADAR_AXES_DERIVED);
    expect(radar.axes[2]).toBe("Revenue share (derived)");
    const shares = radar.series.map((s) => Number.parseFloat(s.raw[2]));
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
  });

  it("MAT is disabled before there are 12 months, and Month is the basis in effect", () => {
    const early = { ...base, period: "2025-04" as Period, basis: "mat" as const };
    expect(analystVM(ds, early).matDisabled).toBe(true);
    expect(analystVM(ds, early).basis).toBe("month");
    expect(overviewVM(ds, early).caption).toBe(
      "April 2025 · Month · MAT unavailable, showing Month",
    );
    const ok = { ...early, period: "2025-05" as Period };
    expect(analystVM(ds, ok).matDisabled).toBe(false);
    expect(analystVM(ds, ok).basis).toBe("mat");
    expect(overviewVM(ds, ok).caption).toBe("May 2025 · MAT");
  });
});

describe("grid follows the selected period", () => {
  it("shows derived values for an earlier month and says so", () => {
    const grid = analystVM(ds, { ...europe, period: "2026-03" as Period }).grid;
    if (grid.kind !== "markets") throw new Error("expected market rows");
    const de = grid.rows.find((r) => r.id === "de");
    expect(de?.revenue).toBe("$1.21M");
    expect(de?.attainment).toBe("92.2%");
    expect(grid.caption).toBe(
      "5 markets · March 2026 · Sorted by revenue · Derived · sum of series",
    );
    expect(grid.caption).not.toContain("Latest month");
  });
});
