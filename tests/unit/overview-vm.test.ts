import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, type Context, type Dataset, type Period } from "@/domain";
import {
  attentionVM,
  overviewVM,
  panelContextVM,
  regionBarsVM,
  stripVM,
  verdictVM,
  whatChangedVM,
} from "@/features/overview/viewModel";

const ds = parseDataset(raw);
const base: Context = {
  period: "2026-05" as Period,
  mode: "executive",
  metric: "attainment",
  basis: "month",
};

const strings = (ctx: Context) =>
  overviewVM(ds, ctx).tiles.map((t) => ({
    label: t.label,
    headline: t.headline,
    delta: `${t.delta.value} ${t.delta.comparison}`.trim(),
    direction: t.delta.direction,
    provenance: t.provenance,
  }));

describe("overview view model", () => {
  it("portfolio, May 2026", () => {
    expect(strings(base)).toEqual([
      {
        label: "PORTFOLIO REVENUE",
        headline: "$22.85M",
        delta: "+7.3% vs May 2025",
        direction: "up",
        provenance: "Derived · sum of series",
      },
      {
        label: "FORECAST ATTAINMENT",
        headline: "100.4%",
        delta: "+$0.10M vs forecast",
        direction: "up",
        provenance: "Derived · sum of series",
      },
      {
        label: "GROWTH, YEAR ON YEAR",
        headline: "+7.3%",
        delta: "YTD +6.1% vs 2025",
        direction: "up",
        provenance: "Derived · sum of series",
      },
      {
        label: "NEEDS ATTENTION",
        headline: "6 of 13",
        delta: "4 at risk · 2 off track",
        direction: "flat",
        provenance: "Source · data.json",
      },
    ]);
  });

  it("Germany, May 2026", () => {
    const tiles = strings({ ...base, region: "eu", market: "de" });
    expect(tiles[0]).toMatchObject({
      label: "GERMANY REVENUE",
      headline: "$1.68M",
      delta: "−9.7% vs May 2025",
      direction: "down",
      provenance: "Source · data.json",
    });
    expect(tiles[1]).toMatchObject({
      headline: "92.0%",
      delta: "−$0.14M vs forecast",
      direction: "down",
    });
    expect(tiles[2]).toMatchObject({ headline: "−9.7%", direction: "down" });
    expect(tiles[2]?.delta).toMatch(/^YTD [+−]\d+\.\d% vs 2025$/);
    expect(tiles[3]).toMatchObject({
      label: "STATUS",
      headline: "Off track",
      delta: "Attainment 92.0% · Growth −9.7%",
      direction: "flat",
    });
  });

  it("map values carry the accessible phrase and a 13-row table sorted by name", () => {
    const { map } = overviewVM(ds, base);
    expect(map.values["de"]).toMatchObject({
      name: "Germany",
      label: "92.0% attainment",
      statusLabel: "Off track",
    });
    expect(map.rows).toHaveLength(13);
    expect(map.rows.map((r) => r.name)).toEqual([...map.rows.map((r) => r.name)].sort());
  });

  it("Analyst's map follows the metric", () => {
    const analyst = { ...base, mode: "analyst" } as const;
    const rev = overviewVM(ds, { ...analyst, metric: "revenue" }).map;
    expect(rev.values["de"]?.label).toBe("$1.68M revenue");
    const growth = overviewVM(ds, { ...analyst, metric: "growth" }).map;
    expect(growth.values["de"]?.label).toBe("−9.7% growth");
  });

  it("the executive map ignores the URL metric and reads attainment", () => {
    const map = overviewVM(ds, { ...base, mode: "executive", metric: "growth" }).map;
    expect(map.metric).toBe("attainment");
    expect(map.values["de"]?.label).toBe("92.0% attainment");
  });
});

describe("overview scope, title and map focus", () => {
  it("portfolio: title, caption, nothing dimmed", () => {
    const vm = overviewVM(ds, base);
    expect(vm.title).toBe("Portfolio");
    expect(vm.caption).toBe("May 2026 · Month");
    expect(vm.map.focus).toBeUndefined();
  });
  it("market and product: entity title, region markets stay in focus", () => {
    const vm = overviewVM(ds, {
      ...base,
      region: "eu",
      market: "de",
      product: "veltrix",
      period: "2026-03" as Period,
      mode: "analyst",
      basis: "ytd",
    });
    expect(vm.title).toBe("Germany · Veltrix");
    expect(vm.caption).toBe("March 2026 · YTD");
    expect(vm.map.selected).toBe("de");
    expect(vm.map.focus).toContain("de");
    expect(vm.map.focus).not.toContain("cn");
  });
});

const sentence = (ctx: Context, source: Dataset = ds) =>
  verdictVM(source, ctx)
    .segments.map((s) => s.text)
    .join("");

const allOnTrack: Dataset = {
  ...ds,
  markets: ds.markets.map((m) => ({ ...m, kpis: { ...m.kpis, status: "on_track" as const } })),
};

describe("verdict", () => {
  it("reads the portfolio, a region and a market in the published templates", () => {
    expect(sentence(base)).toBe(
      "Portfolio is on track at 100.4% of forecast, up 7.3% on last year. Six markets need attention.",
    );
    expect(sentence({ ...base, region: "eu" })).toBe(
      "Europe is at risk at 95.4% of forecast, up 1.7% on last year. Five markets need attention.",
    );
    expect(sentence({ ...base, region: "eu", market: "de" })).toBe(
      "Germany is off track at 92.0% of forecast, down 9.7% on last year. Revenue fell 27.2% in March.",
    );
  });

  it("tags the status phrase, the attention phrase and every number", () => {
    const v = verdictVM(ds, base);
    expect(v.segments.filter((s) => s.role !== "plain")).toEqual([
      { text: "on track", role: "status" },
      { text: "100.4%", role: "number" },
      { text: "7.3%", role: "number" },
      { text: "Six markets need attention", role: "attention" },
    ]);
    expect(v.status).toBe("on_track");
    expect(v.attention).toBe("bad");
    expect(verdictVM(ds, { ...base, region: "eu" }).status).toBe("at_risk");
    expect(verdictVM(ds, { ...base, region: "latam" }).attention).toBe("warn");
  });

  it("derives the status of a region from its figures and labels it Derived", () => {
    expect(verdictVM(ds, base).caption).toBe("Derived · sum of series");
    expect(verdictVM(ds, { ...base, region: "eu", market: "de" }).caption).toBe(
      "Source · data.json",
    );
  });

  it("has an eyebrow with entity, period and basis", () => {
    expect(verdictVM(ds, base).eyebrow).toBe("PORTFOLIO · MAY 2026 · MONTH");
  });

  it("says no markets need attention when every market is on track", () => {
    const v = verdictVM(allOnTrack, base);
    expect(v.segments.map((s) => s.text).join("")).toMatch(/ No markets need attention\.$/);
    expect(v.attention).toBe("none");
    expect(v.segments.some((s) => s.role === "attention")).toBe(false);
  });
});

describe("status strip", () => {
  it("lists regions in fixed order, flagged markets first by attainment", () => {
    const groups = stripVM(ds, base);
    expect(groups.map((g) => `${g.name} ${g.count}`)).toEqual([
      "North America 2",
      "Europe 5",
      "APAC 4",
      "LATAM 2",
    ]);
    expect(groups.flatMap((g) => g.markets.map((m) => m.name))).toEqual([
      "United States",
      "Canada",
      "Germany",
      "Spain",
      "Italy",
      "United Kingdom",
      "France",
      "Japan",
      "China",
      "India",
      "Australia",
      "Brazil",
      "Mexico",
    ]);
  });

  it("shows one region at region scope and nothing at market scope", () => {
    expect(stripVM(ds, { ...base, region: "eu" }).map((g) => g.id)).toEqual(["eu"]);
    expect(stripVM(ds, { ...base, region: "eu", market: "de" })).toEqual([]);
  });
});

describe("attention list", () => {
  it("ranks off track first, then at risk, each by attainment", () => {
    const vm = attentionVM(ds, base);
    if (vm.kind !== "markets") throw new Error("expected the market list");
    expect(vm.rows.map((r) => [r.rank, r.name, r.statusLabel, r.attainment, r.growth])).toEqual([
      [1, "Germany", "Off track", "92.0%", "−9.7%"],
      [2, "Spain", "Off track", "104.5%", "−4.6%"],
      [3, "Italy", "At risk", "93.0%", "+0.3%"],
      [4, "United Kingdom", "At risk", "94.3%", "+8.8%"],
      [5, "Brazil", "At risk", "96.0%", "+2.0%"],
      [6, "France", "At risk", "96.4%", "+11.6%"],
    ]);
    expect(vm.rising.map((r) => [r.name, r.growth])).toEqual([
      ["China", "+18.2%"],
      ["France", "+11.6%"],
      ["Canada", "+10.7%"],
    ]);
    expect(vm.caption).toBe("Off track first, then at risk by attainment · May 2026");
  });

  it("carries twelve months of revenue and the Ask why prompt", () => {
    const vm = attentionVM(ds, base);
    if (vm.kind !== "markets") throw new Error("expected the market list");
    const germany = vm.rows[0];
    expect(germany?.spark).toHaveLength(12);
    expect(germany?.askWhy.text).toBe("Why did Germany's revenue dip?");
    expect(vm.rows.find((r) => r.id === "es")?.askWhy.text).toBe("Why is Spain off track?");
  });

  it("is limited to the region in scope", () => {
    const vm = attentionVM(ds, { ...base, region: "latam" });
    if (vm.kind !== "markets") throw new Error("expected the market list");
    expect(vm.rows.map((r) => r.name)).toEqual(["Brazil"]);
    expect(vm.rising.map((r) => r.name)).toEqual(["Mexico", "Brazil"]);
  });

  it("has no rows when every market is on track", () => {
    const vm = attentionVM(allOnTrack, base);
    if (vm.kind !== "markets") throw new Error("expected the market list");
    expect(vm.rows).toEqual([]);
    expect(vm.rising.map((r) => r.name)).toEqual(["China", "France", "Canada"]);
  });

  it("lists the products of a market instead, without status", () => {
    const vm = attentionVM(ds, { ...base, region: "eu", market: "de" });
    if (vm.kind !== "products") throw new Error("expected the product list");
    expect(vm.rows.map((r) => r.name)).toEqual([
      "Veltrix",
      "Nuvora",
      "Orbispan",
      "Calyx",
      "Zephyra",
    ]);
    expect(vm.rows[0]?.spark).toHaveLength(12);
  });
});

describe("region health", () => {
  it("derives a status for each region with the published rule", () => {
    const expected = [
      ["North America", "on_track"],
      ["Europe", "at_risk"],
      ["APAC", "on_track"],
      ["LATAM", "at_risk"],
    ];
    expect(stripVM(ds, base).map((g) => [g.name, g.status])).toEqual(expected);
    expect(regionBarsVM(ds, base).rows.map((r) => [r.name, r.status])).toEqual(expected);
    expect(stripVM(ds, base)[1]?.statusLabel).toBe("At risk");
  });
});

describe("revenue trend", () => {
  it("carries 24 months of actuals and forecast on the revenue tile", () => {
    const tile = overviewVM(ds, base).tiles[0];
    expect(tile?.trend?.actual).toHaveLength(24);
    expect(tile?.trend?.forecast).toHaveLength(24);
    expect(tile?.trend?.label).toBe("24-month revenue trend, latest $22.85M");
  });
  it("follows the entity in scope", () => {
    const tile = overviewVM(ds, { ...base, region: "eu", market: "de" }).tiles[0];
    expect(tile?.trend?.label).toBe("24-month revenue trend, latest $1.68M");
  });
});

describe("region bars", () => {
  it("lists the four regions with revenue and attainment", () => {
    const vm = regionBarsVM(ds, base);
    expect(vm.rows.map((r) => [r.name, r.revenue, r.attainment])).toEqual([
      ["North America", "$4.38M", "101.0%"],
      ["Europe", "$7.06M", "95.4%"],
      ["APAC", "$9.49M", "104.9%"],
      ["LATAM", "$1.92M", "98.0%"],
    ]);
    expect(vm.caption).toBe("Derived · sum of series");
  });

  it("names the drag", () => {
    const { sentence: s } = regionBarsVM(ds, base);
    expect(s.lead + s.rest).toBe(
      "Europe is the drag. All five European markets are flagged, and its attainment is 4.6 points under forecast.",
    );
  });

  it("names the leader when no region is under forecast", () => {
    const { sentence: s } = regionBarsVM(
      { ...ds, series: ds.series.map((f) => ({ ...f, forecast: f.actual / 1.02 })) },
      base,
    );
    expect(s.lead + s.rest).toBe("North America leads at 102.0% of forecast.");
  });
});

describe("what changed", () => {
  it("picks the market furthest from plan", () => {
    expect(whatChangedVM(ds, base).text).toBe(
      "Germany is furthest from plan: 92.0% of forecast and −9.7% on last year, after a 27.2% drop in March.",
    );
    expect(whatChangedVM(ds, { ...base, region: "latam" }).text).toBe(
      "Brazil is furthest from plan: 96.0% of forecast and +2.0% on last year.",
    );
  });

  it("labels the panel context", () => {
    expect(panelContextVM(ds, base).about).toBe("About Portfolio · May 2026");
    expect(panelContextVM(ds, { ...base, region: "eu", market: "de" }).about).toBe(
      "About Germany · May 2026",
    );
  });
});
