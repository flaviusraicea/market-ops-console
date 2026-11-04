import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { type Context, type Period } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { overviewVM, regionBarsVM } from "@/features/overview/viewModel";
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
      ["Italy", "IT", "At risk", "$941K", "93.0%", "+0.3%", "28.9%"],
      ["Spain", "ES", "Off track", "$765K", "104.5%", "−4.6%", "18.1%"],
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

  it("gridVM for Germany: five product rows with Veltrix $574K and 92.7%", () => {
    const grid = analystVM(ds, germany).grid;
    if (grid.kind !== "products") throw new Error("expected product rows");
    expect(grid.rows).toHaveLength(5);
    expect(grid.rows[0]?.name).toBe("Veltrix");
    expect(grid.summary).toBe("5 products · May 2026 · Month");
    expect(grid.caption).toBe("Derived · sum of series");
    const veltrix = grid.rows.find((r) => r.id === "veltrix");
    expect(veltrix?.revenue).toBe("$574K");
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
      momPct: -27.2,
      ariaLabel: "Anomaly: March 2026 revenue fell 27 percent versus February",
    });
    expect(ts.title).toBe("Germany revenue");
    expect(ts.subtitle).toBe(
      "Actual vs forecast vs prior year · June 2024 – May 2026 · USD · Derived",
    );
    expect(ts.chartTitle).toBe("Germany · Revenue vs forecast vs prior year");
    expect(ts.desc).toContain("Line chart of Germany monthly revenue from June 2024 to May 2026.");
    expect(ts.desc).toContain("Actual below forecast in 24 of 24 months");
    expect(ts.desc).toContain("Table available via View as table.");
  });

  it("timeSeriesVM has no anomaly outside a market, and keeps Germany's on a product", () => {
    expect(analystVM(ds, europe).timeSeries.anomalies).toHaveLength(0);
    const veltrix = analystVM(ds, { ...germany, product: "veltrix" }).timeSeries;
    expect(veltrix.title).toBe("Germany · Veltrix revenue");
    expect(veltrix.chartTitle).toBe("Germany · Veltrix · Revenue vs forecast vs prior year");
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

  it("heatMapVM carries month-on-month change per cell, none for the first month", () => {
    const hm = analystVM(ds, germany).heatMap;
    const de = hm.rows.find((r) => r.id === "de");
    expect(de?.cells[0]?.momPct).toBeUndefined();
    expect(de?.cells.find((c) => c.period === "2026-03")?.momPct).toBe(-27.2);
  });

  it("heatMapVM hint names the outlined cell, and only when a market is selected", () => {
    expect(analystVM(ds, europe).heatMap.hint).toBe("Shift+Enter on a focused cell asks about it.");
    expect(analystVM(ds, { ...germany, period: "2026-03" as Period }).heatMap.hint).toBe(
      "Mar 2026 is the outlined cell in the Germany row. Shift+Enter on a focused cell asks about it.",
    );
  });

  it("heatMapVM rows sort by revenue over the shown window, so a cell click never reorders them", () => {
    for (const ctx of [europe, base]) {
      const rows = analystVM(ds, ctx).heatMap.rows;
      const total = (r: (typeof rows)[number]) => r.cells.reduce((sum, c) => sum + c.actual, 0);
      for (let i = 1; i < rows.length; i++)
        expect(total(rows[i - 1]!)).toBeGreaterThanOrEqual(total(rows[i]!));
      // The selected period changes with every click; the order must not.
      const other = analystVM(ds, { ...ctx, period: "2025-06" as Period }).heatMap.rows;
      expect(other.map((r) => r.id)).toEqual(rows.map((r) => r.id));
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
    expect(radar.axes).toEqual([
      "Attainment",
      "Growth YoY",
      "Share (given)",
      "Month on month",
      "Units YoY",
    ]);
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
      "--cat-3",
      "--cat-5",
      "--cat-6",
      "--ink-2",
    ]);
    for (let axis = 0; axis < 5; axis++) {
      const vals = radar.series.map((s) => s.values[axis]!);
      expect(Math.min(...vals)).toBeCloseTo(0.115, 3);
      expect(Math.max(...vals)).toBeCloseTo(0.885, 3);
    }
    expect(radar.series.find((s) => s.id === "de")?.raw).toEqual([
      "92.0%",
      "−9.7%",
      "8.9%",
      "+1.1%",
      "−9.9%",
    ]);
  });

  it("radarVM: Germany month on month for March 2026 and units year on year for May 2026", () => {
    const march = analystVM(ds, { ...europe, period: "2026-03" as Period }).radar;
    expect(march.series.find((s) => s.id === "de")?.raw[3]).toBe("−27.2%");
    const may = analystVM(ds, europe).radar;
    expect(may.series.find((s) => s.id === "de")?.raw[4]).toBe("−9.9%");
  });

  it("radarVM at the portfolio: four regions and the derived third axis", () => {
    const radar = analystVM(ds, base).radar;
    expect(radar.series).toHaveLength(4);
    expect(radar.axes).toEqual(RADAR_AXES_DERIVED);
    expect(radar.axes[2]).toBe("Revenue share (derived)");
    const shares = radar.series.map((s) => Number.parseFloat(s.raw[2]!));
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
  });

  it("radarVM keeps all five axes; one nobody has a value for is null for every market, and the subtitle says so", () => {
    // Units YoY needs the same month a year earlier, which the first twelve months lack.
    const early = analystVM(ds, { ...europe, period: "2025-03" as Period }).radar;
    expect(early.axes).toEqual(RADAR_AXES_GIVEN);
    expect(early.subtitle).toContain("Units YoY unavailable before Jun 2025");
    expect(early.caption).toContain("Attainment and growth derived");
    expect(
      early.series.every(
        (s) =>
          s.values.length === 5 &&
          s.values[4] === null &&
          s.values.slice(0, 4).every((v) => v !== null),
      ),
    ).toBe(true);
    // The first month has neither month on month nor units YoY, and still draws five axes.
    const first = analystVM(ds, { ...europe, period: "2024-06" as Period }).radar;
    expect(first.axes).toHaveLength(5);
    expect(first.series.every((s) => s.values[3] === null && s.values[4] === null)).toBe(true);
    // From Jun 2025 the axis is back, with a value for every market.
    const later = analystVM(ds, { ...europe, period: "2025-06" as Period }).radar;
    expect(later.axes).toHaveLength(5);
    expect(later.subtitle).not.toContain("unavailable");
  });

  it("radarVM market caption names units YoY as derived", () => {
    expect(analystVM(ds, europe).radar.caption).toBe(
      "May 2026 · Month · Attainment, growth and units YoY derived · share from data.json",
    );
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
    expect(grid.summary).toBe("5 markets · March 2026 · Month");
    expect(grid.caption).toBe("Derived · sum of series");
  });
});

describe("ledger grid", () => {
  it("the portfolio total row sums the markets: revenue, forecast, prior year, attainment, growth, units", () => {
    const grid = analystVM(ds, base).grid;
    expect(grid.total).toEqual({
      label: "Portfolio",
      revenue: "$22.9M",
      forecast: "$22.7M",
      priorYear: "$21.3M",
      attainment: "100.4%",
      growth: "+7.3%",
      growthDirection: "up",
      units: "103,868",
    });
  });

  it("the Europe total row is labelled with the region and the market rows carry region, forecast, prior year, units", () => {
    const grid = analystVM(ds, europe).grid;
    if (grid.kind !== "markets") throw new Error("expected market rows");
    expect(grid.total.label).toBe("Europe");
    const de = grid.rows.find((r) => r.id === "de");
    expect(de).toMatchObject({ regionId: "eu", regionName: "Europe", units: "7,618" });
    expect(de?.forecast).toMatch(/^\$\d/);
    expect(de?.priorYear).toMatch(/^\$\d/);
    expect(de?.sort.forecast).toBeGreaterThan(0);
    expect(de?.sort.priorYear).toBeGreaterThan(0);
  });

  it("the market grid's eyebrow is Markets at the portfolio and names the region in one", () => {
    expect(analystVM(ds, base).grid.title).toBe("Markets");
    expect(analystVM(ds, europe).grid.title).toBe("Markets · Europe");
    expect(analystVM(ds, base).grid.note).toBe("Status and share are latest month only");
  });

  it("the product grid has forecast, prior year and a market total", () => {
    const grid = analystVM(ds, germany).grid;
    if (grid.kind !== "products") throw new Error("expected product rows");
    expect(grid.total.label).toBe("Germany");
    expect(grid.rows[0]?.forecast).toMatch(/^\$\d/);
    expect(grid.rows[0]?.priorYear).toMatch(/^\$\d/);
  });

  it("region bars: four regions in dataset order and the Europe sentence", () => {
    const bars = regionBarsVM(ds, { ...base, period: "2026-05" as Period });
    expect(bars.rows.map((r) => [r.name, r.revenue, r.attainment])).toEqual([
      ["North America", "$4.38M", "101.0%"],
      ["Europe", "$7.06M", "95.4%"],
      ["APAC", "$9.49M", "104.9%"],
      ["LATAM", "$1.92M", "98.0%"],
    ]);
    expect(bars.sentence.lead).toBe("Europe is the drag.");
    expect(bars.sentence.rest).toBe(
      " All five European markets are flagged, and its attainment is 4.6 points under forecast.",
    );
  });
});

describe("reported vs summed attainment (Differs from source)", () => {
  const ctx = {
    period: ds.meta.latestPeriod,
    mode: "analyst",
    metric: "attainment",
    basis: "month",
  } as const;

  it("notes the pair on Italy's products footer and nowhere for a past month", () => {
    const vm = analystVM(ds, { ...ctx, region: "eu", market: "it" });
    if (vm.grid.kind !== "products") throw new Error("expected the products grid");
    expect(vm.grid.total.attainment).toBe("93.8%");
    expect(vm.grid.total.attainmentNote).toBe("Series sum 93.8% · reported KPI 93.0%");
    const past = analystVM(ds, { ...ctx, period: "2026-04" as Period, region: "eu", market: "it" });
    if (past.grid.kind !== "products") throw new Error("expected the products grid");
    expect(past.grid.total.attainmentNote).toBeUndefined();
  });

  it("flags the latest heat cell of every market and no earlier cell", () => {
    const { rows } = analystVM(ds, ctx).heatMap;
    const germany = rows.find((r) => r.id === "de")!;
    expect(germany.cells.at(-1)?.differs).toBe("Series sum 92.2% · reported KPI 92.0%");
    expect(germany.cells.at(-1)?.reported).toBe("92.0%");
    expect(germany.cells.slice(0, -1).every((c) => c.differs === undefined)).toBe(true);
    expect(rows.every((r) => r.cells.at(-1)?.differs !== undefined)).toBe(true);
  });

  it("explains the latest column once, in the header, and not for a past month", () => {
    expect(analystVM(ds, ctx).heatMap.differsNote).toBe(
      "Latest month: series sums differ from reported KPIs · see the Markets grid footer",
    );
  });

  it("follows the basis in rows, footer, radar and labels, so a screen never mixes two", () => {
    const month = analystVM(ds, europe);
    for (const basis of ["ytd", "mat"] as const) {
      const vm = analystVM(ds, { ...europe, basis });
      if (vm.grid.kind !== "markets" || month.grid.kind !== "markets")
        throw new Error("expected market rows");
      const label = basis === "ytd" ? "YTD" : "MAT";
      expect(vm.grid.summary).toBe(`5 markets · May 2026 · ${label}`);
      expect(vm.grid.total.revenue).not.toBe(month.grid.total.revenue);
      expect(vm.grid.rows[0]?.revenue).not.toBe(month.grid.rows[0]?.revenue);
      expect(vm.radar.caption).toContain(label);
    }
    const ytd = analystVM(ds, { ...germany, basis: "ytd" });
    if (ytd.grid.kind !== "products") throw new Error("expected product rows");
    expect(ytd.grid.summary).toContain("YTD");
  });

  it("MAT falls back to Month before twelve months exist", () => {
    const early = analystVM(ds, { ...europe, period: "2024-06" as Period, basis: "mat" });
    if (early.grid.kind !== "markets") throw new Error("expected market rows");
    expect(early.grid.summary).toContain("Month");
  });
});
