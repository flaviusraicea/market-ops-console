// Builds public/geo/markets.json from world-atlas (110m). Run once with `pnpm build:geo`; the output is committed.
// Layers: one merged "land" backdrop plus the 13 market countries, each tagged with its marketId.
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";
import { feature, merge } from "topojson-client";

type Topology = Parameters<typeof feature>[0];
type Countries = Extract<Topology["objects"][string], { type: "GeometryCollection" }>;

const MARKET_IDS: Record<string, string> = {
  us: "840",
  ca: "124",
  de: "276",
  gb: "826",
  fr: "250",
  it: "380",
  es: "724",
  jp: "392",
  cn: "156",
  in: "356",
  au: "036",
  br: "076",
  mx: "484",
};

// Antarctica has no market and would squeeze the populated world into the top of the frame.
const ANTARCTICA_ID = "010";

const root = path.join(__dirname, "..");
const atlasPath = path.join(root, "node_modules", "world-atlas", "countries-110m.json");
const outPath = path.join(root, "public", "geo", "markets.json");

const topology = JSON.parse(readFileSync(atlasPath, "utf8")) as Topology;
const countries = topology.objects["countries"] as Countries;

const round = (n: number) => Math.round(n * 100) / 100;

function roundRing(ring: Position[]): Position[] {
  const out: Position[] = [];
  for (const [x, y] of ring) {
    const p: Position = [round(x as number), round(y as number)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

function roundPolygon(rings: Position[][]): Position[][] {
  return rings.map(roundRing).filter((ring) => ring.length >= 4);
}

function roundGeometry(g: Polygon | MultiPolygon): Polygon | MultiPolygon {
  if (g.type === "Polygon") return { type: "Polygon", coordinates: roundPolygon(g.coordinates) };
  return {
    type: "MultiPolygon",
    coordinates: g.coordinates.map(roundPolygon).filter((rings) => rings.length > 0),
  };
}

const idToMarket = new Map(Object.entries(MARKET_IDS).map(([market, id]) => [id, market]));

const all = feature(topology, countries).features as Array<
  Feature<Polygon | MultiPolygon> & { id?: string }
>;

const markets: Feature[] = [];
for (const f of all) {
  const marketId = idToMarket.get(String(f.id));
  if (!marketId) continue;
  markets.push({
    type: "Feature",
    properties: { marketId },
    geometry: roundGeometry(f.geometry),
  });
}
markets.sort((a, b) =>
  String(a.properties?.["marketId"]).localeCompare(String(b.properties?.["marketId"])),
);

if (markets.length !== Object.keys(MARKET_IDS).length) {
  throw new Error(
    `Expected ${Object.keys(MARKET_IDS).length} market features, found ${markets.length}`,
  );
}

const landGeometries = countries.geometries.filter(
  (g) => !idToMarket.has(String(g.id)) && String(g.id) !== ANTARCTICA_ID,
);
const land = merge(topology, landGeometries as Parameters<typeof merge>[1]);

const collection: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { kind: "land" }, geometry: roundGeometry(land) },
    ...markets,
  ],
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(collection));
const kb = (statSync(outPath).size / 1024).toFixed(1);
console.log(
  `Wrote ${path.relative(root, outPath)}: ${collection.features.length} features, ${kb} KB`,
);
