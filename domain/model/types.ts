import type { Period, RegionId } from "../contracts/data";

export type Entity =
  | { kind: "portfolio" }
  | { kind: "region"; regionId: RegionId }
  | { kind: "market"; marketId: string }
  | { kind: "product"; marketId: string; productId: string };

export type Basis = "month" | "ytd" | "mat";
/** periods is non-empty and ascending. */
export type Scope = { entity: Entity; periods: readonly Period[] };
export type Mode = "overview" | "analyst";
export type Metric = "attainment" | "revenue" | "growth";
export type Context = {
  region?: RegionId;
  market?: string;
  product?: string;
  period: Period;
  mode: Mode;
  metric: Metric;
  basis: Basis;
  cite?: number;
  facts?: boolean;
};
export type Provenance = "source" | "derived" | "assistant";
export type Totals = {
  actual: number;
  forecast: number;
  priorYear: number;
  units: number;
  factCount: number;
};

/** Partial<Context> where a key may be present with undefined, meaning "clear it" (exactOptionalPropertyTypes). */
export type ContextPatch = { [K in keyof Context]?: Context[K] | undefined };
