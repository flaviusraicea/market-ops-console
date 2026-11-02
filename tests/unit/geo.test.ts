import { readFileSync } from "node:fs";
import path from "node:path";

import type { Feature, FeatureCollection } from "geojson";
import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import { parseDataset } from "@/domain";

const ds = parseDataset(raw);
const geo = JSON.parse(
  readFileSync(path.join(__dirname, "..", "..", "public", "geo", "markets.json"), "utf8"),
) as FeatureCollection;

describe("public/geo/markets.json", () => {
  it("has the land backdrop plus 13 market features", () => {
    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features).toHaveLength(14);
  });

  it("covers every marketId in data.json exactly once", () => {
    const ids = geo.features
      .map((f: Feature) => f.properties?.["marketId"])
      .filter((id): id is string => typeof id === "string");
    expect([...ids].sort()).toEqual(ds.markets.map((m) => m.id).sort());
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("merges every other country into one MultiPolygon", () => {
    const land = geo.features.filter((f) => f.properties?.["kind"] === "land");
    expect(land).toHaveLength(1);
    expect(land[0]?.geometry.type).toBe("MultiPolygon");
  });

  it("leaves Antarctica out of the land backdrop", () => {
    const land = geo.features.find((f) => f.properties?.["kind"] === "land");
    const lats: number[] = [];
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === "number") lats.push(c[1] as number);
      else if (Array.isArray(c)) c.forEach(walk);
    };
    walk((land?.geometry as { coordinates: unknown }).coordinates);
    expect(Math.min(...lats)).toBeGreaterThan(-60);
  });
});
