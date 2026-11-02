import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, resolveCitation, type Period } from "@/domain";
import { targetToContext } from "@/features/assistant/targetToContext";

const ds = parseDataset(raw);
const p = (s: string) => s as Period;

function target(c: Parameters<typeof resolveCitation>[1]) {
  const r = resolveCitation(ds, c);
  if (!r.ok) throw new Error("unresolved");
  return r.target;
}

describe("targetToContext", () => {
  it("maps a product target to region, market, product and period", () => {
    expect(
      targetToContext(target({ marketId: "de", productId: "veltrix", period: p("2026-03") }), ds),
    ).toEqual({
      region: "eu",
      market: "de",
      product: "veltrix",
      period: "2026-03",
      mode: "analyst",
    });
  });
  it("maps a region target and clears market and product", () => {
    const patch = targetToContext(target({ regionId: "apac", period: p("2026-05") }), ds);
    expect(patch).toEqual({
      region: "apac",
      market: undefined,
      product: undefined,
      period: "2026-05",
      mode: "analyst",
    });
    expect(Object.keys(patch)).toEqual(expect.arrayContaining(["market", "product"]));
  });
  it("maps a market target and clears the product", () => {
    expect(targetToContext(target({ marketId: "it", period: p("2026-02") }), ds)).toEqual({
      region: "eu",
      market: "it",
      product: undefined,
      period: "2026-02",
      mode: "analyst",
    });
  });
  it("uses the latest period when the citation names none", () => {
    expect(targetToContext(target({ marketId: "de" }), ds).period).toBe("2026-05");
  });
});
