import {
  STATUS_LABEL,
  STATUS_RULE_TEXT,
  askWhyPrompt,
  attainmentPct,
  effectiveBasis,
  entityName,
  entityOf,
  factsFor,
  growthPct,
  kpiFor,
  marketsIn,
  periodIndex,
  totals,
  type Context,
  type Dataset,
  type Entity,
  type Market,
  type Period,
  type Status,
} from "@/domain";
import {
  formatInt,
  formatMonthName,
  formatMonthShort,
  formatMoneyCompact,
  formatPct,
  formatPeriod,
  formatPeriodMedium,
  formatPeriodShort,
} from "@/lib/format";

const SOURCE = "Source · data.json";
const DERIVED = "Derived · sum of series";
const MINUS = "−";

export const RADAR_AXES_GIVEN = ["Attainment", "Growth", "Share (given)"] as const;
export const RADAR_AXES_DERIVED = ["Attainment", "Growth", "Revenue share (derived)"] as const;

/** Spain's attainment cell explains why a market above 100% is still off track (preview-spec 9.2). */
const OFF_TRACK_ABOVE_PLAN = (attainment: string, growth: string) =>
  `Off track despite ${attainment} attainment. The status rule is not documented in the data; growth is ${growth}.`;

export type SparkVM = {
  /** 24 monthly actuals in thousands of USD, oldest first. */
  values: number[];
  /** Index of the anomaly month, when the entity has one. */
  anomalyIndex?: number;
  label: string;
};

export type AskWhyVM = { aria: string; text: string };

export type MarketRowVM = {
  /** Unformatted revenue; the grid is sorted by it, largest first. */
  revenueValue: number;
  id: string;
  name: string;
  iso2: string;
  status: Status;
  statusLabel: string;
  revenue: string;
  attainment: string;
  growth: string;
  growthDirection: "up" | "down" | "flat";
  share: string;
  /** Present when the status does not follow from the attainment shown. */
  attainmentNote?: string;
  trend: SparkVM;
  askWhy: AskWhyVM;
};

export type ProductRowVM = {
  /** Unformatted revenue; the grid is sorted by it, largest first. */
  revenueValue: number;
  id: string;
  name: string;
  revenue: string;
  attainment: string;
  growth: string;
  growthDirection: "up" | "down" | "flat";
  units: string;
  trend: SparkVM;
  selected: boolean;
};

export type GridVM =
  | {
      kind: "markets";
      title: string;
      caption: string;
      statusRule: string;
      rows: MarketRowVM[];
    }
  | {
      kind: "products";
      title: string;
      caption: string;
      marketId: string;
      rows: ProductRowVM[];
    };

export type SeriesPoint = {
  period: Period;
  /** "Jun 24" */
  label: string;
  /** "Jun 2024" */
  name: string;
  actual: number;
  forecast: number;
  priorYear: number;
  /** Percent, one decimal. */
  attainment: number;
};

export type AnomalyVM = {
  period: Period;
  index: number;
  /** "−27% vs Feb" */
  label: string;
  /** "Anomaly: March 2026 revenue fell 27 percent versus February" */
  ariaLabel: string;
};

export type TimeSeriesVM = {
  title: string;
  caption: string;
  desc: string;
  selectedPeriod: Period;
  points: SeriesPoint[];
  anomalies: AnomalyVM[];
};

export type RadarSeriesVM = {
  id: string;
  name: string;
  /** A CSS custom property such as `--cat-1`. */
  color: string;
  /** Normalised 0..1 per axis, in axis order. */
  values: [number, number, number];
  /** Formatted raw values, in axis order. */
  raw: [string, string, string];
  selected: boolean;
};

export type RadarVM = {
  title: string;
  caption: string;
  axes: readonly [string, string, string];
  series: RadarSeriesVM[];
};

export type HeatCellVM = {
  period: Period;
  /** Attainment, percent with one decimal. */
  value: number;
  display: string;
  actual: number;
  forecast: number;
};
export type HeatRowVM = { id: string; name: string; cells: HeatCellVM[] };
export type HeatMapVM = {
  title: string;
  caption: string;
  periods: Period[];
  rows: HeatRowVM[];
  selected: { market: string; period: Period } | undefined;
};

export type AnalystVM = {
  basis: Context["basis"];
  matDisabled: boolean;
  grid: GridVM;
  timeSeries: TimeSeriesVM;
  radar: RadarVM;
  heatMap: HeatMapVM;
};

const direction = (n: number): "up" | "down" | "flat" => (n > 0 ? "up" : n < 0 ? "down" : "flat");

/** Markets compared by the radar and the heat map: the region when one is in view, otherwise all. */
function peerMarkets(ds: Dataset, ctx: Context): Market[] {
  return ctx.region ? marketsIn(ds, { kind: "region", regionId: ctx.region }) : ds.markets;
}

function monthlyActuals(ds: Dataset, entity: Entity): number[] {
  const facts = factsFor(ds, { entity, periods: ds.meta.periods });
  const byPeriod = new Map<string, number>();
  for (const f of facts) byPeriod.set(f.period, (byPeriod.get(f.period) ?? 0) + f.actual);
  return ds.meta.periods.map((p) => Math.round((byPeriod.get(p) ?? 0) / 1000));
}

function sparkFor(ds: Dataset, entity: Entity, anomalyPeriod?: string): SparkVM {
  const values = monthlyActuals(ds, entity);
  const latest = values[values.length - 1] ?? 0;
  const anomalyIndex = anomalyPeriod ? periodIndex(ds, anomalyPeriod) : -1;
  return {
    values,
    ...(anomalyIndex >= 0 ? { anomalyIndex } : {}),
    label: `24-month revenue trend, scaled to its own range, latest ${formatMoneyCompact(latest * 1000)}`,
  };
}

function gridVM(ds: Dataset, ctx: Context): GridVM {
  if (ctx.market) {
    const market = ds.markets.find((m) => m.id === ctx.market);
    const marketId = ctx.market;
    const periodLabel = formatPeriod(ctx.period);
    const rows: ProductRowVM[] = ds.products
      .map((p) => {
        const entity: Entity = { kind: "product", marketId, productId: p.id };
        const t = totals(factsFor(ds, { entity, periods: [ctx.period] }));
        const growth = growthPct(t);
        return {
          revenueValue: t.actual,
          id: p.id,
          name: p.name,
          revenue: formatMoneyCompact(t.actual),
          attainment: formatPct(attainmentPct(t), { sign: false }),
          growth: formatPct(growth, { sign: true }),
          growthDirection: direction(growth),
          units: formatInt(t.units),
          trend: sparkFor(ds, entity),
          selected: ctx.product === p.id,
        };
      })
      .sort((a, b) => b.revenueValue - a.revenueValue);
    return {
      kind: "products",
      title: `Products · ${market?.name ?? marketId}`,
      caption: `${rows.length} products · ${periodLabel} · Sorted by revenue · ${DERIVED}`,
      marketId,
      rows,
    };
  }

  const entity = entityOf(ctx);
  const markets = marketsIn(ds, entity);
  const atLatest = ctx.period === ds.meta.latestPeriod;
  // Values follow the selected period. Status, share and the anomaly list are given only for the latest month.
  const rows: MarketRowVM[] = markets
    .map((m) => ({ m, k: kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, "month") }))
    .sort((a, b) => b.k.totals.actual - a.k.totals.actual)
    .map(({ m, k }) => {
      const attainment = formatPct(k.attainmentPct, { sign: false });
      const growth = formatPct(k.growthPct, { sign: true });
      const aboveButOff = m.kpis.status === "off_track" && k.attainmentPct >= 100;
      return {
        revenueValue: k.totals.actual,
        id: m.id,
        name: m.name,
        iso2: m.iso2.toUpperCase(),
        status: m.kpis.status,
        statusLabel: STATUS_LABEL[m.kpis.status],
        revenue: formatMoneyCompact(k.totals.actual),
        attainment,
        growth,
        growthDirection: direction(k.growthPct),
        share: formatPct(m.kpis.sharePct, { sign: false }),
        ...(aboveButOff ? { attainmentNote: OFF_TRACK_ABOVE_PLAN(attainment, growth) } : {}),
        trend: sparkFor(ds, { kind: "market", marketId: m.id }, m.kpis.anomalies[0]?.period),
        askWhy: askWhyPrompt(m.id, m.name, m.kpis.status),
      };
    });
  return {
    kind: "markets",
    title: `Markets · ${entityName(ds, entity)}`,
    caption: `${rows.length} markets · ${formatPeriod(ctx.period)} · Sorted by revenue · ${atLatest ? SOURCE : DERIVED}`,
    statusRule: STATUS_RULE_TEXT,
    rows,
  };
}

function anomalyLabel(ds: Dataset, entity: Entity, period: Period): AnomalyVM | undefined {
  const index = periodIndex(ds, period);
  const prevPeriod = index > 0 ? ds.meta.periods[index - 1] : undefined;
  if (index < 0 || !prevPeriod) return undefined;
  const cur = totals(factsFor(ds, { entity, periods: [period] })).actual;
  const prev = totals(factsFor(ds, { entity, periods: [prevPeriod] })).actual;
  const change = Math.round((cur / prev - 1) * 100);
  const word = change < 0 ? "fell" : "rose";
  const abs = Math.abs(change);
  return {
    period,
    index,
    label: `${change < 0 ? MINUS : "+"}${abs}% vs ${formatMonthShort(prevPeriod)}`,
    ariaLabel: `Anomaly: ${formatMonthName(period)} ${period.slice(0, 4)} revenue ${word} ${abs} percent versus ${formatMonthName(prevPeriod)}`,
  };
}

function timeSeriesVM(ds: Dataset, ctx: Context): TimeSeriesVM {
  const entity = entityOf(ctx);
  const name = entityName(ds, entity);
  const periods = ds.meta.periods;
  const facts = factsFor(ds, { entity, periods });
  const acc = new Map<string, { actual: number; forecast: number; priorYear: number }>();
  for (const f of facts) {
    const a = acc.get(f.period) ?? { actual: 0, forecast: 0, priorYear: 0 };
    a.actual += f.actual;
    a.forecast += f.forecast;
    a.priorYear += f.priorYear;
    acc.set(f.period, a);
  }
  const points: SeriesPoint[] = periods.map((period) => {
    const a = acc.get(period) ?? { actual: 0, forecast: 1, priorYear: 0 };
    return {
      period,
      label: formatPeriodShort(period),
      name: formatPeriodMedium(period),
      actual: a.actual,
      forecast: a.forecast,
      priorYear: a.priorYear,
      attainment: Math.round((a.actual / a.forecast) * 1000) / 10,
    };
  });

  const anomalies: AnomalyVM[] = [];
  if (ctx.market) {
    const market = ds.markets.find((m) => m.id === ctx.market);
    for (const a of market?.kpis.anomalies ?? []) {
      const vm = anomalyLabel(ds, entity, a.period);
      if (vm) anomalies.push(vm);
    }
  }

  const below = points.filter((p) => p.actual < p.forecast).length;
  const above = points.length - below;
  const direct = below >= above ? `below forecast in ${below}` : `above forecast in ${above}`;
  const first = periods[0] ?? "";
  const last = periods[periods.length - 1] ?? "";
  const anomalyText = anomalies.length
    ? `; ${anomalies.map((a) => a.ariaLabel.replace("Anomaly: ", "anomaly: ")).join("; ")}`
    : "";
  const desc = `Line chart of ${name} monthly revenue from ${formatPeriod(first)} to ${formatPeriod(last)}. Actual ${direct} of ${points.length} months${anomalyText}. Table available via View as table.`;

  return {
    title: `${name} · Revenue vs forecast vs prior year`,
    caption: `${formatPeriodMedium(first)} – ${formatPeriodMedium(last)} · USD · ${DERIVED}`,
    desc,
    selectedPeriod: ctx.period,
    points,
    anomalies,
  };
}

function minMax(values: number[]): (v: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return (v) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
}

function radarVM(ds: Dataset, ctx: Context): RadarVM {
  const atPortfolio = !ctx.region;
  const rawRows = atPortfolio
    ? ds.regions.map((r) => {
        const entity: Entity = { kind: "region", regionId: r.id };
        const k = kpiFor(ds, entity, ctx.period, "month");
        const portfolio = kpiFor(ds, { kind: "portfolio" }, ctx.period, "month");
        return {
          id: r.id,
          name: r.name,
          attainment: k.attainmentPct,
          growth: k.growthPct,
          share: (k.totals.actual / portfolio.totals.actual) * 100,
          selected: false,
        };
      })
    : peerMarkets(ds, ctx).map((m) => {
        const k = kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, "month");
        return {
          id: m.id,
          name: m.name,
          attainment: k.attainmentPct,
          growth: k.growthPct,
          share: m.kpis.sharePct,
          selected: ctx.market === m.id,
        };
      });

  const byName = [...rawRows].sort((a, b) => a.name.localeCompare(b.name));
  const norm = [
    minMax(byName.map((r) => r.attainment)),
    minMax(byName.map((r) => r.growth)),
    minMax(byName.map((r) => r.share)),
  ] as const;
  const series: RadarSeriesVM[] = byName.slice(0, 6).map((r, i) => ({
    id: r.id,
    name: r.name,
    color: `--cat-${i + 1}`,
    values: [norm[0](r.attainment), norm[1](r.growth), norm[2](r.share)],
    raw: [
      formatPct(r.attainment, { sign: false }),
      formatPct(r.growth, { sign: true }),
      formatPct(r.share, { sign: false }),
    ],
    selected: r.selected,
  }));

  const scope = atPortfolio
    ? "Regions"
    : `Markets · ${entityName(ds, { kind: "region", regionId: ctx.region! })}`;
  return {
    title: `${scope} compared`,
    caption: `${formatPeriod(ctx.period)} · ${atPortfolio ? DERIVED : "Attainment and growth derived · share given"}`,
    axes: atPortfolio ? RADAR_AXES_DERIVED : RADAR_AXES_GIVEN,
    series,
  };
}

function heatMapVM(ds: Dataset, ctx: Context): HeatMapVM {
  const markets = peerMarkets(ds, ctx);
  const periods = ds.meta.periods as Period[];
  const rows: HeatRowVM[] = markets.map((m) => {
    const cells = periods.map((period) => {
      const t = totals(
        factsFor(ds, { entity: { kind: "market", marketId: m.id }, periods: [period] }),
      );
      const value = attainmentPct(t);
      return {
        period,
        value,
        display: formatPct(value, { sign: false }),
        actual: t.actual,
        forecast: t.forecast,
      };
    });
    return { id: m.id, name: m.name, cells };
  });
  const scope = ctx.region ? entityName(ds, { kind: "region", regionId: ctx.region }) : "Portfolio";
  return {
    title: `Attainment by month · ${scope}`,
    caption: `${formatPeriodMedium(periods[0] ?? "")} – ${formatPeriodMedium(periods[periods.length - 1] ?? "")} · % of forecast · ${DERIVED}`,
    periods,
    rows,
    selected: ctx.market ? { market: ctx.market, period: ctx.period } : undefined,
  };
}

export function analystVM(ds: Dataset, ctx: Context): AnalystVM {
  return {
    basis: effectiveBasis(ds, ctx.basis, ctx.period),
    matDisabled: periodIndex(ds, ctx.period) < 11,
    grid: gridVM(ds, ctx),
    timeSeries: timeSeriesVM(ds, ctx),
    radar: radarVM(ds, ctx),
    heatMap: heatMapVM(ds, ctx),
  };
}
