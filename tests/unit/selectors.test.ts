import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import {
  attainmentPct,
  attentionCount,
  breadcrumbTrail,
  factsFor,
  growthPct,
  kpiFor,
  momChangePct,
  periodsForBasis,
  statusCounts,
  topMovers,
  totals,
  variance,
  type Entity,
  type Period,
} from "@/domain";
import { parseDataset } from "@/domain/dataset";

const ds = parseDataset(raw);
const p = (s: string) => s as Period;
const portfolio: Entity = { kind: "portfolio" };
const region = (regionId: "na" | "eu" | "apac" | "latam"): Entity => ({ kind: "region", regionId });
const market = (marketId: string): Entity => ({ kind: "market", marketId });
const sum = (entity: Entity, periods: Period[]) => totals(factsFor(ds, { entity, periods }));

describe("totals and KPIs", () => {
  it("Germany, month 2026-05", () => {
    const t = sum(market("de"), [p("2026-05")]);
    expect(t.actual).toBe(1676586);
    expect(t.forecast).toBe(1817644);
    expect(t.priorYear).toBe(1857237);
    expect(attainmentPct(t)).toBe(92.2);
    expect(growthPct(t)).toBe(-9.7);
    const k = kpiFor(ds, market("de"), p("2026-05"), "month");
    expect(k.provenance).toBe("source");
    expect(k.attainmentPct).toBe(92.0);
  });

  it("Germany 2026-03 and month-on-month change", () => {
    const t = sum(market("de"), [p("2026-03")]);
    expect(t.actual).toBe(1211930);
    expect(t.forecast).toBe(1314025);
    expect(momChangePct(ds, market("de"), p("2026-03"))).toBe(-27.2);
  });

  it("Germany x Veltrix, 2026-03", () => {
    const t = sum({ kind: "product", marketId: "de", productId: "veltrix" }, [p("2026-03")]);
    expect(t.actual).toBe(427196);
    expect(t.forecast).toBe(461648);
    expect(t.priorYear).toBe(603279);
  });

  it("Portfolio month, derived", () => {
    const t = sum(portfolio, [p("2026-05")]);
    expect([t.actual, t.forecast, t.priorYear]).toEqual([22850419, 22748448, 21294644]);
    expect(attainmentPct(t)).toBe(100.4);
    expect(growthPct(t)).toBe(7.3);
    expect(variance(t)).toBe(101971);
    expect(kpiFor(ds, portfolio, p("2026-05"), "month").provenance).toBe("derived");
  });

  it("Portfolio YTD", () => {
    const periods = periodsForBasis(ds, "ytd", p("2026-05"));
    expect(periods).toHaveLength(5);
    const t = sum(portfolio, periods);
    expect([t.actual, t.forecast, t.priorYear]).toEqual([110210757, 110040590, 103900359]);
    expect(attainmentPct(t)).toBe(100.2);
    expect(growthPct(t)).toBe(6.1);
  });

  it("Portfolio MAT", () => {
    const periods = periodsForBasis(ds, "mat", p("2026-05"));
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe("2025-06");
    const t = sum(portfolio, periods);
    expect([t.actual, t.forecast, t.priorYear]).toEqual([277150778, 277116484, 261136404]);
  });

  it("Europe month, YTD, MAT", () => {
    const m = sum(region("eu"), [p("2026-05")]);
    expect([m.actual, m.forecast, m.priorYear]).toEqual([7057380, 7398806, 6937825]);
    expect(attainmentPct(m)).toBe(95.4);
    expect(growthPct(m)).toBe(1.7);
    const ytd = sum(region("eu"), periodsForBasis(ds, "ytd", p("2026-05")));
    expect([ytd.actual, ytd.forecast]).toEqual([34288077, 36065499]);
    const mat = sum(region("eu"), periodsForBasis(ds, "mat", p("2026-05")));
    expect([mat.actual, mat.forecast]).toEqual([88027864, 92685940]);
  });

  it("APAC month", () => {
    const t = sum(region("apac"), [p("2026-05")]);
    expect([t.actual, t.forecast]).toEqual([9491556, 9051254]);
    expect(attainmentPct(t)).toBe(104.9);
    expect(growthPct(t)).toBe(11.5);
  });
});

describe("periodsForBasis", () => {
  it("MAT needs 12 periods", () => {
    expect(() => periodsForBasis(ds, "mat", p("2025-04"))).toThrow(RangeError);
    const periods = periodsForBasis(ds, "mat", p("2025-05"));
    expect(periods).toHaveLength(12);
    expect(periods[0]).toBe("2024-06");
  });
});

describe("rankings", () => {
  it("top movers", () => {
    const m = topMovers(ds);
    expect(m.rising.map((x) => [x.market.id, x.growthPct])).toEqual([
      ["cn", 18.2],
      ["fr", 11.6],
      ["ca", 10.7],
    ]);
    expect(m.falling.map((x) => [x.market.id, x.growthPct])).toEqual([
      ["de", -9.7],
      ["es", -4.6],
      ["it", 0.3],
    ]);
  });

  it("status counts", () => {
    expect(statusCounts(ds, portfolio)).toEqual({ on_track: 7, at_risk: 4, off_track: 2 });
    expect(attentionCount(ds, portfolio)).toBe(6);
    expect(statusCounts(ds, region("eu"))).toEqual({ on_track: 0, at_risk: 3, off_track: 2 });
  });
});

describe("breadcrumbTrail", () => {
  it("labels the full drill path", () => {
    const trail = breadcrumbTrail(ds, {
      region: "eu",
      market: "de",
      product: "veltrix",
      period: p("2026-05"),
      mode: "executive",
      metric: "attainment",
      basis: "month",
    });
    expect(trail.map((t) => t.label)).toEqual(["Portfolio", "Europe", "Germany", "Veltrix"]);
  });
});
