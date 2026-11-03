import { z } from "zod";

export const PeriodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .brand<"Period">();
export type Period = z.infer<typeof PeriodSchema>;

export const RegionIdSchema = z.enum(["na", "eu", "apac", "latam"]);
export const StatusSchema = z.enum(["on_track", "at_risk", "off_track"]);
export const AnomalySchema = z.object({ period: PeriodSchema, type: z.string(), note: z.string() });
export const KpisSchema = z.object({
  revenue: z.number(),
  growthPct: z.number(),
  sharePct: z.number(),
  forecastAttainmentPct: z.number(),
  status: StatusSchema,
  anomalies: z.array(AnomalySchema),
});
export const MarketSchema = z.object({
  id: z.string(),
  name: z.string(),
  iso3: z.string().length(3),
  iso2: z.string().length(2),
  regionId: RegionIdSchema,
  kpis: KpisSchema,
});
export const ProductSchema = z.object({ id: z.string(), name: z.string() });
export const RegionSchema = z.object({ id: RegionIdSchema, name: z.string() });
export const FactSchema = z.object({
  marketId: z.string(),
  productId: z.string(),
  period: PeriodSchema,
  actual: z.number().nonnegative(),
  forecast: z.number().positive(),
  units: z.number().nonnegative(),
  priorYear: z.number().nonnegative(),
});
export const MetaSchema = z.object({
  currency: z.literal("USD"),
  periods: z.array(PeriodSchema).min(1),
  latestPeriod: PeriodSchema,
  generatedAt: z.string().optional(),
  /** Set only by live mode: the latest month holds simulated figures, not the saved ones. */
  simulated: z.boolean().optional(),
});

function shiftMonths(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
}

export const DatasetSchema = z
  .object({
    meta: MetaSchema,
    regions: z.array(RegionSchema),
    products: z.array(ProductSchema),
    markets: z.array(MarketSchema),
    series: z.array(FactSchema),
  })
  .superRefine((d, ctx) => {
    const regionIds = new Set<string>(d.regions.map((r) => r.id));
    const marketIds = new Set(d.markets.map((m) => m.id));
    const productIds = new Set(d.products.map((p) => p.id));

    d.markets.forEach((m, i) => {
      if (!regionIds.has(m.regionId)) {
        ctx.addIssue({
          code: "custom",
          path: ["markets", i, "regionId"],
          message: `Unknown region "${m.regionId}"`,
        });
      }
    });

    const actualByKey = new Map<string, number>();
    d.series.forEach((f, i) => {
      if (!marketIds.has(f.marketId)) {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "marketId"],
          message: `Unknown market "${f.marketId}"`,
        });
      }
      if (!productIds.has(f.productId)) {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "productId"],
          message: `Unknown product "${f.productId}"`,
        });
      }
      actualByKey.set(`${f.marketId}|${f.productId}|${f.period}`, f.actual);
    });

    if (d.meta.periods[d.meta.periods.length - 1] !== d.meta.latestPeriod) {
      ctx.addIssue({
        code: "custom",
        path: ["meta", "latestPeriod"],
        message: "latestPeriod must be the last of periods",
      });
    }

    const expected = d.markets.length * d.products.length * d.meta.periods.length;
    if (d.series.length !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["series"],
        message: `Expected ${expected} facts (markets × products × periods), found ${d.series.length}`,
      });
    }

    const periodSet = new Set<string>(d.meta.periods);
    d.series.forEach((f, i) => {
      const earlier = shiftMonths(f.period, -12);
      if (!periodSet.has(earlier)) return;
      const prior = actualByKey.get(`${f.marketId}|${f.productId}|${earlier}`);
      if (prior !== undefined && prior !== f.priorYear) {
        ctx.addIssue({
          code: "custom",
          path: ["series", i, "priorYear"],
          message: `priorYear ${f.priorYear} does not equal actual ${prior} of ${earlier}`,
        });
      }
    });
  });

export type Dataset = z.infer<typeof DatasetSchema>;
export type Market = z.infer<typeof MarketSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type Kpis = z.infer<typeof KpisSchema>;
export type Status = z.infer<typeof StatusSchema>;
export type RegionId = z.infer<typeof RegionIdSchema>;

export function parseDataset(input: unknown): Dataset {
  return DatasetSchema.parse(input);
}

export type Entity =
  | { kind: "portfolio" }
  | { kind: "region"; regionId: RegionId }
  | { kind: "market"; marketId: string }
  | { kind: "product"; marketId: string; productId: string };

/** The wire form of an Entity, for requests that carry one. */
export const EntitySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("portfolio") }),
  z.object({ kind: z.literal("region"), regionId: RegionIdSchema }),
  z.object({ kind: z.literal("market"), marketId: z.string() }),
  z.object({ kind: z.literal("product"), marketId: z.string(), productId: z.string() }),
]) satisfies z.ZodType<Entity>;

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
