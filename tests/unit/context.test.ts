import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset } from "@/domain/dataset";
import { applyContextChange, metaFromDataset } from "@/lib/context/invariants";
import { parseContextFromSearchParams } from "@/lib/context/parsers";

const ds = parseDataset(raw);

describe("parseContextFromSearchParams", () => {
  it("a market implies its region and takes the defaults", () => {
    const ctx = parseContextFromSearchParams(ds, { market: "de" });
    expect(ctx.region).toBe("eu");
    expect(ctx.period).toBe("2026-05");
    expect(ctx.mode).toBe("executive");
  });
  it("clamps an unknown period and drops a product without a market", () => {
    const ctx = parseContextFromSearchParams(ds, { period: "2030-01", product: "veltrix" });
    expect(ctx.period).toBe("2026-05");
    expect(ctx.product).toBeUndefined();
  });
  it("reads facts only as the flag the client writes, facts=1", () => {
    expect(parseContextFromSearchParams(ds, { mode: "analyst", facts: "1" }).facts).toBe(true);
    expect(
      parseContextFromSearchParams(ds, { mode: "analyst", facts: "true" }).facts,
    ).toBeUndefined();
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
    mode: "executive",
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
