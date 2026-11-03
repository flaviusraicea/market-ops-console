import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { type Period } from "@/domain";
import { parseDataset } from "@/domain/dataset";
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
    expect(hrefFor(meta, { period: meta.latestPeriod as Period, mode: "overview" })).toBe("/");
  });
  it("puts product between market and period", () => {
    expect(
      hrefFor(meta, { market: "de", region: "eu", product: "veltrix", metric: "revenue" }),
    ).toBe("/?region=eu&market=de&product=veltrix&metric=revenue");
  });
});
