import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset, type Period } from "@/domain";
import { hrefFor } from "@/lib/context/href";
import { metaFromDataset } from "@/lib/context/invariants";

const meta = metaFromDataset(parseDataset(raw));

describe("hrefFor", () => {
  it("serialises in a fixed key order and omits defaults", () => {
    expect(
      hrefFor(meta, { region: "eu", market: "de", period: "2026-03" as Period, mode: "analyst" }),
    ).toBe("/?region=eu&market=de&period=2026-03&mode=analyst");
  });
  it("is the bare root for the default portfolio view", () => {
    expect(hrefFor(meta, { period: meta.latestPeriod as Period, mode: "executive" })).toBe("/");
  });
  it("omits the mode when it is the role's default, and writes it when it is not", () => {
    const analyst = metaFromDataset(parseDataset(raw), "analyst");
    expect(hrefFor(analyst, { mode: "analyst" })).toBe("/");
    expect(hrefFor(analyst, { mode: "executive" })).toBe("/?mode=executive");
    expect(hrefFor(meta, { mode: "analyst" })).toBe("/?mode=analyst");
  });
  it("puts product between market and period", () => {
    expect(
      hrefFor(meta, { market: "de", region: "eu", product: "veltrix", metric: "revenue" }),
    ).toBe("/?region=eu&market=de&product=veltrix&metric=revenue");
  });
});
