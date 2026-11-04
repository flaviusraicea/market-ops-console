import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { kpiFor, type Context, type Period } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { analystVM } from "@/features/analyst/viewModel";
import { overviewVM } from "@/features/overview/viewModel";
import { LIVE_BOUND, applyLiveOverlay, driftFactor } from "@/lib/live";

const ds = parseDataset(raw);
const latest = ds.meta.latestPeriod;

describe("live overlay", () => {
  it("is pure and seeded: the same tick gives the same dataset, and the input is untouched", () => {
    const before = JSON.stringify(ds);
    const a = applyLiveOverlay(ds, 7);
    const b = applyLiveOverlay(ds, 7);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(ds)).toBe(before);
    expect(JSON.stringify(applyLiveOverlay(ds, 8))).not.toBe(JSON.stringify(a));
  });

  it("tick 0 is the saved data", () => {
    expect(applyLiveOverlay(ds, 0)).toBe(ds);
  });

  it("changes only the latest period's actual and units", () => {
    const next = applyLiveOverlay(ds, 3);
    expect(next.series).toHaveLength(ds.series.length);
    let moved = 0;
    next.series.forEach((f, i) => {
      // Same length as the input (asserted above), so the index is always in range.
      const was = ds.series[i]!;
      if (f.period === latest) {
        expect({ ...f, actual: 0, units: 0 }).toEqual({ ...was, actual: 0, units: 0 });
        if (f.actual !== was.actual) moved += 1;
      } else {
        expect(f).toEqual(was);
      }
    });
    expect(moved).toBeGreaterThan(0);
    expect(next.meta).toEqual({ ...ds.meta, simulated: true });
    expect(next.regions).toEqual(ds.regions);
  });

  it("keeps every market within 0.3 % of its saved revenue over 100 ticks", () => {
    for (const m of ds.markets) {
      for (let tick = 0; tick <= 100; tick++) {
        const factor = driftFactor(m.id, tick);
        expect(factor).toBeGreaterThanOrEqual(1 - LIVE_BOUND);
        expect(factor).toBeLessThanOrEqual(1 + LIVE_BOUND);
      }
    }
    const end = applyLiveOverlay(ds, 100);
    for (const m of ds.markets) {
      const was = kpiFor(ds, { kind: "market", marketId: m.id }, latest, "month").totals.actual;
      const now = end.markets.find((x) => x.id === m.id)!.kpis.revenue;
      expect(Math.abs(now / was - 1)).toBeLessThanOrEqual(LIVE_BOUND + 0.001);
    }
  });

  it("flips no market status within a minute of live ticks", () => {
    for (let tick = 1; tick <= 12; tick++) {
      const next = applyLiveOverlay(ds, tick);
      for (const m of ds.markets) {
        expect(next.markets.find((x) => x.id === m.id)?.kpis.status).toBe(m.kpis.status);
      }
    }
  });

  it("moves a market by at most 0.1 % in one tick", () => {
    for (const m of ds.markets) {
      for (let tick = 1; tick <= 50; tick++) {
        const step = driftFactor(m.id, tick) / driftFactor(m.id, tick - 1);
        expect(Math.abs(step - 1)).toBeLessThanOrEqual(0.001 + 1e-9);
      }
    }
  });

  it("follows the published rule once the drift crosses a threshold", () => {
    // Mexico sits 0.05 points above plan: a small downward drift takes it below 100 %, so it becomes at risk.
    const edge = {
      ...ds,
      markets: ds.markets.map((m) =>
        m.id === "mx"
          ? {
              ...m,
              kpis: {
                ...m.kpis,
                forecastAttainmentPct: 100.1,
                growthPct: 4,
                status: "on_track" as const,
              },
            }
          : m,
      ),
    };
    const mx = (d: typeof ds) => d.markets.find((m) => m.id === "mx")!;
    let crossed: ReturnType<typeof applyLiveOverlay> | undefined;
    for (let tick = 1; tick <= 400 && !crossed; tick++) {
      const candidate = applyLiveOverlay(edge, tick);
      if (mx(candidate).kpis.forecastAttainmentPct < 100) crossed = candidate;
    }
    expect(crossed, "Mexico drifts under plan within 400 ticks").toBeDefined();
    expect(mx(crossed!).kpis.status).toBe("at_risk");
  });

  it("scales the given figures instead of re-deriving them, so there is no jump at the first tick", () => {
    const next = applyLiveOverlay(ds, 1);
    for (const m of ds.markets) {
      const was = m.kpis;
      const now = next.markets.find((x) => x.id === m.id)?.kpis;
      expect(now).toBeDefined();
      if (!now) continue;
      const factor = driftFactor(m.id, 1);
      expect(now.revenue).toBe(Math.round(was.revenue * factor));
      // One tick moves a market by at most 0.1 %, so given figures stay within a hair of that.
      expect(Math.abs(now.forecastAttainmentPct - was.forecastAttainmentPct)).toBeLessThanOrEqual(
        was.forecastAttainmentPct * 0.001 + 0.1,
      );
    }
  });

  it("never touches sharePct: it is external market share, not a share of the portfolio", () => {
    const next = applyLiveOverlay(ds, 25);
    for (const m of ds.markets) {
      expect(next.markets.find((x) => x.id === m.id)?.kpis.sharePct).toBe(m.kpis.sharePct);
    }
  });

  it("marks the dataset simulated, and tick 0 is not", () => {
    expect(applyLiveOverlay(ds, 2).meta.simulated).toBe(true);
    expect(applyLiveOverlay(ds, 0).meta.simulated).toBeUndefined();
  });

  describe("captions", () => {
    const base: Context = { period: latest, mode: "analyst", metric: "attainment", basis: "month" };
    const live = applyLiveOverlay(ds, 3);

    it("say Derived · live for views that include the latest month", () => {
      expect(overviewVM(ds, base).tiles[0]?.provenance).toBe("Derived · sum of series");
      expect(overviewVM(live, base).tiles[0]?.provenance).toBe("Derived · live");
      expect(analystVM(live, base).heatMap.caption).toContain("Derived · live");
    });

    it("keep their saved labels for an earlier month, except the heat map, which always spans the latest", () => {
      const earlier = { ...base, period: "2026-03" as Period };
      expect(overviewVM(live, earlier).tiles[0]?.provenance).toBe("Derived · sum of series");
      expect(analystVM(live, earlier).grid.caption).toBe("Derived · sum of series");
      expect(analystVM(live, earlier).heatMap.caption).toContain("Derived · live");
    });
  });
});
