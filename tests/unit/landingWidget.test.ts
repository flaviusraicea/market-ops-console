import { describe, expect, it } from "vitest";

import type { Entity, Period } from "@/domain";
import { centredScrollTop } from "@/features/analyst/landingScroll";
import { landingWidget } from "@/features/analyst/landingWidget";

const target = (entity: Entity, periodDefaulted: boolean) => ({
  entity,
  period: "2026-03" as Period,
  label: "x",
  periodDefaulted,
});

describe("landingWidget", () => {
  it("names exactly one widget per citation kind", () => {
    const market: Entity = { kind: "market", marketId: "de" };
    const product: Entity = { kind: "product", marketId: "de", productId: "veltrix" };
    const region: Entity = { kind: "region", regionId: "emea" as never };
    expect(landingWidget(target(market, false), "analyst")).toBe("timeseries");
    expect(landingWidget(target(product, false), "analyst")).toBe("timeseries");
    expect(landingWidget(target(market, true), "analyst")).toBe("gridSection");
    expect(landingWidget(target(product, true), "analyst")).toBe("productRow");
    expect(landingWidget(target(region, true), "analyst")).toBe("gridSection");
    expect(landingWidget(target(region, true), "executive")).toBe("regionRow");
    expect(landingWidget(target({ kind: "portfolio" }, true), "executive")).toBe("kpiTile");
  });
});

describe("centredScrollTop", () => {
  const base = { scrollY: 500, toolbarBottom: 100, viewportHeight: 900 };
  it("centres a widget in the area under the toolbar", () => {
    // avail 800, height 400: 200px above and below.
    expect(centredScrollTop({ ...base, targetTop: 700, targetHeight: 400 })).toBe(900);
  });
  it("aligns a taller widget 16px under the toolbar", () => {
    expect(centredScrollTop({ ...base, targetTop: 700, targetHeight: 1000 })).toBe(1084);
  });
  it("never scrolls above the page", () => {
    expect(centredScrollTop({ ...base, scrollY: 0, targetTop: 50, targetHeight: 100 })).toBe(0);
  });
});
