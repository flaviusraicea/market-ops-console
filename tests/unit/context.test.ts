import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset } from "@/domain";
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
