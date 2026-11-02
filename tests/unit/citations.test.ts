import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, resolveCitation, type Period } from "@/domain";

const ds = parseDataset(raw);
const p = (s: string) => s as Period;

describe("resolveCitation", () => {
  it("resolves market + product + period to a product entity", () => {
    const r = resolveCitation(ds, { marketId: "de", productId: "veltrix", period: p("2026-03") });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.target.entity.kind).toBe("product");
      expect(r.target.periodDefaulted).toBe(false);
    }
  });
  it("resolves a region", () => {
    const r = resolveCitation(ds, { regionId: "apac", period: p("2026-05") });
    expect(r.ok && r.target.entity.kind).toBe("region");
  });
  it("defaults a missing period to the latest", () => {
    const r = resolveCitation(ds, { marketId: "de" });
    expect(r.ok && r.target.period).toBe("2026-05");
    expect(r.ok && r.target.periodDefaulted).toBe(true);
  });
  it("fails on an unknown market", () => {
    const r = resolveCitation(ds, { marketId: "xx" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("unknown_market");
  });
  it("detects disagreement with the source status", () => {
    const c = { marketId: "de", period: p("2026-05") };
    const a = resolveCitation(ds, c, "Germany is at risk");
    expect(a.ok && a.disagreement).toEqual({ assistant: "at risk", source: "off_track" });
    const b = resolveCitation(ds, c, "Germany is off track");
    expect(b.ok && b.disagreement).toBeUndefined();
    const d = resolveCitation(ds, { marketId: "it" }, "Italy is at risk");
    expect(d.ok && d.disagreement).toBeUndefined();
  });
});
