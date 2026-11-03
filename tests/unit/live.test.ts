import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { kpiFor, parseDataset } from "@/domain";
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
      const was = ds.series[i]!;
      if (f.period === latest) {
        expect({ ...f, actual: 0, units: 0 }).toEqual({ ...was, actual: 0, units: 0 });
        if (f.actual !== was.actual) moved += 1;
      } else {
        expect(f).toEqual(was);
      }
    });
    expect(moved).toBeGreaterThan(0);
    expect(next.meta).toEqual(ds.meta);
    expect(next.regions).toEqual(ds.regions);
  });

  it("keeps every market within 8 % of its saved revenue over 100 ticks", () => {
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

  it("moves a market by at most 2 % in one tick", () => {
    for (const m of ds.markets) {
      for (let tick = 1; tick <= 50; tick++) {
        const step = driftFactor(m.id, tick) / driftFactor(m.id, tick - 1);
        expect(Math.abs(step - 1)).toBeLessThanOrEqual(0.02 + 1e-9);
      }
    }
  });

  it("recomputes status with the published rule: Spain flips to at risk once its growth is not negative", () => {
    const spain = (d: typeof ds) => d.markets.find((m) => m.id === "es")!;
    expect(spain(ds).kpis.status).toBe("off_track");
    let found: ReturnType<typeof applyLiveOverlay> | undefined;
    for (let tick = 1; tick <= 400 && !found; tick++) {
      const candidate = applyLiveOverlay(ds, tick);
      if (spain(candidate).kpis.growthPct >= 0) found = candidate;
    }
    expect(found, "Spain's growth reaches 0 within 400 ticks").toBeDefined();
    const k = spain(found!).kpis;
    expect(k.status).toBe(k.forecastAttainmentPct < 100 ? "at_risk" : "on_track");
    expect(k.status).not.toBe("off_track");
  });

  it("derived figures follow the moved facts", () => {
    const next = applyLiveOverlay(ds, 5);
    for (const m of next.markets) {
      const k = kpiFor(next, { kind: "market", marketId: m.id }, latest, "month");
      expect(k.totals.actual).toBe(m.kpis.revenue);
    }
    const share = next.markets.reduce((n, m) => n + m.kpis.sharePct, 0);
    expect(share).toBeGreaterThan(99);
    expect(share).toBeLessThan(101);
  });
});
