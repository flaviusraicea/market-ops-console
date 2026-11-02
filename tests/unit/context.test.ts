import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset } from "@/domain";
import { applyContextChange, metaFromDataset } from "@/lib/context/invariants";
import { parseContextFromSearchParams } from "@/lib/context/parsers";

const ds = parseDataset(raw);

describe("parseContextFromSearchParams", () => {
  it("a market implies its region and takes the defaults", () => {
    const ctx = parseContextFromSearchParams(ds, { market: "de" });
    expect(ctx.region).toBe("eu");
    expect(ctx.period).toBe("2026-05");
    expect(ctx.mode).toBe("overview");
  });
  it("clamps an unknown period and drops a product without a market", () => {
    const ctx = parseContextFromSearchParams(ds, { period: "2030-01", product: "veltrix" });
    expect(ctx.period).toBe("2026-05");
    expect(ctx.product).toBeUndefined();
  });
  it("round-trips a full drill state", () => {
    const ctx = parseContextFromSearchParams(ds, {
      region: "eu",
      market: "de",
      product: "veltrix",
      period: "2026-03",
      mode: "analyst",
    });
    expect(ctx).toMatchObject({
      region: "eu",
      market: "de",
      product: "veltrix",
      period: "2026-03",
      mode: "analyst",
    });
  });
});

describe("applyContextChange invariants", () => {
  const meta = metaFromDataset(ds);
  const base = {
    period: "2026-05",
    mode: "overview",
    metric: "attainment",
    basis: "month",
  } as const;
  it("derives region when market is set without it", () => {
    const r = applyContextChange(meta, base as never, { market: "de" });
    expect(r.ok && r.next.region).toBe("eu");
  });
  it("rejects a product with no market", () => {
    const r = applyContextChange(meta, base as never, { product: "veltrix" });
    expect(r.ok).toBe(false);
  });
});

describe("MAT basis", () => {
  it("falls back to Month when the period has fewer than twelve months", () => {
    expect(parseContextFromSearchParams(ds, { basis: "mat", period: "2025-04" }).basis).toBe(
      "month",
    );
    expect(parseContextFromSearchParams(ds, { basis: "mat", period: "2025-05" }).basis).toBe("mat");
  });
});
