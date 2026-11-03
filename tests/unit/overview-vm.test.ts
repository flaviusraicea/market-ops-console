import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, topMovers, type Context, type Period } from "@/domain";
import { overviewVM } from "@/features/overview/viewModel";

const ds = parseDataset(raw);
const base: Context = {
  period: "2026-05" as Period,
  mode: "overview",
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

  it("top movers, rising and falling, match the domain selector", () => {
    const { movers } = overviewVM(ds, base);
    expect(movers.rising.map((m) => m.name)).toEqual(["China", "France", "Canada"]);
    expect(movers.falling.map((m) => m.name)).toEqual(["Germany", "Spain", "Italy"]);
    expect(movers.rising[0]?.display).toBe("+18.2%");
    expect(movers.falling[0]?.display).toBe("−9.7%");
    const reference = topMovers(ds, 3);
    expect(movers.rising.map((m) => m.id)).toEqual(reference.rising.map((m) => m.market.id));
    expect(movers.falling.map((m) => m.id)).toEqual(reference.falling.map((m) => m.market.id));
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
    expect(map.provenance).toBe("Source · data.json");
  });

  it("the map follows the metric", () => {
    const rev = overviewVM(ds, { ...base, metric: "revenue" }).map;
    expect(rev.values["de"]?.label).toBe("$1.68M revenue");
    const growth = overviewVM(ds, { ...base, metric: "growth" }).map;
    expect(growth.values["de"]?.label).toBe("−9.7% growth");
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
