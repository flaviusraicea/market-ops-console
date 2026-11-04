import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset } from "@/domain/dataset";
import { applyContextChange, metaFromDataset } from "@/lib/context/invariants";
import { hasInvalidContextParams, parseContextFromSearchParams } from "@/lib/context/parsers";

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
  it("derives no region from a name on the object prototype", () => {
    const r = applyContextChange(meta, base as never, { market: "constructor" });
    expect(r.ok && r.next.region).toBeUndefined();
  });
  it("rejects a product with no market", () => {
    const r = applyContextChange(meta, base as never, { product: "veltrix" });
    expect(r.ok).toBe(false);
  });
});

describe("hasInvalidContextParams", () => {
  const invalid = (params: Record<string, string>) =>
    hasInvalidContextParams(params, parseContextFromSearchParams(ds, params));

  it("accepts every value that parses as written, including the defaults", () => {
    expect(invalid({})).toBe(false);
    expect(invalid({ period: "2026-05", mode: "executive", metric: "attainment" })).toBe(false);
    expect(
      invalid({
        region: "eu",
        market: "de",
        product: "veltrix",
        period: "2026-03",
        mode: "analyst",
        basis: "ytd",
        cite: "1",
        facts: "1",
      }),
    ).toBe(false);
  });
  it("does not count what parsing adds: a market's region", () => {
    expect(invalid({ market: "de" })).toBe(false);
  });
  it("flags a value that fell back", () => {
    expect(invalid({ period: "2030-01" })).toBe(true);
    expect(invalid({ market: "xx" })).toBe(true);
    expect(invalid({ region: "na", market: "de" })).toBe(true);
    expect(invalid({ product: "veltrix" })).toBe(true);
    expect(invalid({ metric: "share" })).toBe(true);
    expect(invalid({ cite: "first" })).toBe(true);
    expect(invalid({ facts: "true" })).toBe(true);
  });
  it("treats names on the object prototype as unknown markets", () => {
    for (const market of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(parseContextFromSearchParams(ds, { market }).market).toBeUndefined();
      expect(parseContextFromSearchParams(ds, { market }).region).toBeUndefined();
      expect(invalid({ market })).toBe(true);
    }
  });
});
