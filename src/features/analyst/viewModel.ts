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
  momChangePct,
  periodIndex,
  totals,
  type Context,
  type Dataset,
  type Entity,
  type Market,
  type Period,
  type RegionId,
  type Status,
} from "@/domain";
import {
  formatInt,
  formatMonthName,
  formatMonthShort,
  formatMoneyCompact,
  formatPct,
  formatPeriod,
  formatPeriodAbbr,
  formatPeriodShort,
} from "@/lib/format";

const SOURCE = "Source · data.json";
const DERIVED = "Derived · sum of series";
const MINUS = "−";

export const RADAR_AXES_GIVEN = [
  "Attainment",
  "Growth YoY",
  "Share (given)",
  "Month on month",
  "Forecast accuracy",
] as const;
export const RADAR_AXES_DERIVED = [
  "Attainment",
  "Growth YoY",
  "Revenue share (derived)",
  "Month on month",
  "Forecast accuracy",
] as const;
export type RadarTuple<T> = [T, T, T, T, T];

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

/** The grid columns a reader can sort by. */
export type SortKey =
  "name" | "revenue" | "forecast" | "priorYear" | "attainment" | "growth" | "share" | "units";

/** Unformatted values behind each sortable column. */
export type SortValues = Partial<Record<SortKey, number>>;

export type MarketRowVM = {
  /** Unformatted revenue; the grid is sorted by it, largest first. */
  revenueValue: number;
  id: string;
  name: string;
  iso2: string;
  regionId: RegionId;
  regionName: string;
  status: Status;
  statusLabel: string;
  revenue: string;
  forecast: string;
  priorYear: string;
  attainment: string;
  units: string;
  sort: SortValues;
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
  forecast: string;
  priorYear: string;
  attainment: string;
  growth: string;
  growthDirection: "up" | "down" | "flat";
  units: string;
  sort: SortValues;
  trend: SparkVM;
  selected: boolean;
};

/** The total row under the grid: the entity in view, summed or derived from its facts. */
export type GridTotalVM = {
  label: string;
  revenue: string;
  forecast: string;
  priorYear: string;
  attainment: string;
  growth: string;
  growthDirection: "up" | "down" | "flat";
  units: string;
};

type GridBase = {
  /** The section's eyebrow, e.g. `Markets` or `Markets · Europe`. */
  title: string;
  /** Count and period, e.g. `13 markets · May 2026`; the grid appends the sort and the note. */
  summary: string;
  /** What the latest month alone gives, e.g. `Status and share are latest month only`. */
  note: string;
  caption: string;
  total: GridTotalVM;
};

export type GridVM =
  | (GridBase & {
      kind: "markets";
      statusRule: string;
      rows: MarketRowVM[];
    })
  | (GridBase & {
      kind: "products";
      marketId: string;
      rows: ProductRowVM[];
    });

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
  /** The section eyebrow, e.g. `Portfolio revenue`. */
  title: string;
  subtitle: string;
  /** The full sentence, for the chart's accessible name and the table caption. */
  chartTitle: string;
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
  values: RadarTuple<number>;
  /** Formatted raw values, in axis order. */
  raw: RadarTuple<string>;
  selected: boolean;
};

export type RadarVM = {
  /** The chart's accessible title and the table caption. */
  title: string;
  subtitle: string;
  caption: string;
  axes: readonly string[];
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
  /** The chart's accessible name and the table caption. */
  title: string;
  subtitle: string;
  caption: string;
  periods: Period[];
  rows: HeatRowVM[];
  selected: { market: string; period: Period } | undefined;
};

export type AnalystVM = {
  statusRule: string;
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

/** The one market order shared by the grid and the heat map: selected period's revenue, largest first. */
function marketsByRevenue(ds: Dataset, markets: Market[], period: Period) {
  return markets
    .map((m) => ({ m, k: kpiFor(ds, { kind: "market", marketId: m.id }, period, "month") }))
    .sort((a, b) => b.k.totals.actual - a.k.totals.actual);
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

function totalFor(ds: Dataset, entity: Entity, period: Period, label: string): GridTotalVM {
  const t = totals(factsFor(ds, { entity, periods: [period] }));
  const growth = growthPct(t);
  return {
    label,
    revenue: formatMoneyCompact(t.actual),
    forecast: formatMoneyCompact(t.forecast),
    priorYear: formatMoneyCompact(t.priorYear),
    attainment: formatPct(attainmentPct(t), { sign: false }),
    growth: formatPct(growth, { sign: true }),
    growthDirection: direction(growth),
    units: formatInt(t.units),
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
        const attainment = attainmentPct(t);
        return {
          revenueValue: t.actual,
          id: p.id,
          name: p.name,
          revenue: formatMoneyCompact(t.actual),
          forecast: formatMoneyCompact(t.forecast),
          priorYear: formatMoneyCompact(t.priorYear),
          attainment: formatPct(attainment, { sign: false }),
          growth: formatPct(growth, { sign: true }),
          growthDirection: direction(growth),
          units: formatInt(t.units),
          sort: {
            revenue: t.actual,
            forecast: t.forecast,
            priorYear: t.priorYear,
            attainment,
            growth,
            units: t.units,
          },
          trend: sparkFor(ds, entity),
          selected: ctx.product === p.id,
        };
      })
      .sort((a, b) => b.revenueValue - a.revenueValue);
    const name = market?.name ?? marketId;
    return {
      kind: "products",
      title: `Products · ${name}`,
      summary: `${rows.length} products · ${periodLabel}`,
      note: "",
      caption: DERIVED,
      marketId,
      rows,
      total: totalFor(ds, { kind: "market", marketId }, ctx.period, name),
    };
  }

  const entity = entityOf(ctx);
  const markets = marketsIn(ds, entity);
  const atLatest = ctx.period === ds.meta.latestPeriod;
  const regionName = new Map(ds.regions.map((r) => [r.id, r.name]));
  // Values follow the selected period. Status, share and the anomaly list are given only for the latest month.
  const rows: MarketRowVM[] = marketsByRevenue(ds, markets, ctx.period).map(({ m, k }) => {
    const attainment = formatPct(k.attainmentPct, { sign: false });
    const growth = formatPct(k.growthPct, { sign: true });
    const aboveButOff = m.kpis.status === "off_track" && k.attainmentPct >= 100;
    return {
      revenueValue: k.totals.actual,
      id: m.id,
      name: m.name,
      iso2: m.iso2.toUpperCase(),
      regionId: m.regionId,
      regionName: regionName.get(m.regionId) ?? m.regionId,
      status: m.kpis.status,
      statusLabel: STATUS_LABEL[m.kpis.status],
      revenue: formatMoneyCompact(k.totals.actual),
      forecast: formatMoneyCompact(k.totals.forecast),
      priorYear: formatMoneyCompact(k.totals.priorYear),
      attainment,
      units: formatInt(k.totals.units),
      sort: {
        revenue: k.totals.actual,
        forecast: k.totals.forecast,
        priorYear: k.totals.priorYear,
        attainment: k.attainmentPct,
        growth: k.growthPct,
        share: m.kpis.sharePct,
        units: k.totals.units,
      },
      growth,
      growthDirection: direction(k.growthPct),
      share: formatPct(m.kpis.sharePct, { sign: false }),
      ...(aboveButOff ? { attainmentNote: OFF_TRACK_ABOVE_PLAN(attainment, growth) } : {}),
      trend: sparkFor(ds, { kind: "market", marketId: m.id }, m.kpis.anomalies[0]?.period),
      askWhy: askWhyPrompt(m),
    };
  });
  return {
    kind: "markets",
    title: entity.kind === "portfolio" ? "Markets" : `Markets · ${entityName(ds, entity)}`,
    summary: `${rows.length} markets · ${formatPeriod(ctx.period)}`,
    note: "Status and share are latest month only",
    caption: atLatest ? SOURCE : DERIVED,
    statusRule: STATUS_RULE_TEXT,
    rows,
    total: totalFor(ds, entity, ctx.period, entityName(ds, entity)),
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
      name: formatPeriodAbbr(period),
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
    title: `${name} revenue`,
    subtitle: `Actual vs forecast vs prior year · ${formatPeriod(first)} – ${formatPeriod(last)} · USD · Derived`,
    chartTitle: `${name} · Revenue vs forecast vs prior year`,
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

/** Forecast accuracy in percentage points, higher is better. */
const accuracy = (attainmentPct: number) => 100 - Math.abs(attainmentPct - 100);

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
          mom: momChangePct(ds, entity, ctx.period),
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
          mom: momChangePct(ds, { kind: "market", marketId: m.id }, ctx.period),
          selected: ctx.market === m.id,
        };
      });

  const byName = [...rawRows].sort((a, b) => a.name.localeCompare(b.name));
  const norm = [
    minMax(byName.map((r) => r.attainment)),
    minMax(byName.map((r) => r.growth)),
    minMax(byName.map((r) => r.share)),
    minMax(byName.map((r) => r.mom ?? 0)),
    minMax(byName.map((r) => accuracy(r.attainment))),
  ] as const;
  const series: RadarSeriesVM[] = byName.slice(0, 6).map((r, i) => ({
    id: r.id,
    name: r.name,
    color: `--cat-${i + 1}`,
    values: [
      norm[0](r.attainment),
      norm[1](r.growth),
      norm[2](r.share),
      norm[3](r.mom ?? 0),
      norm[4](accuracy(r.attainment)),
    ],
    raw: [
      formatPct(r.attainment, { sign: false }),
      formatPct(r.growth, { sign: true }),
      formatPct(r.share, { sign: false }),
      r.mom === undefined ? "n/a" : formatPct(r.mom, { sign: true }),
      formatPct(accuracy(r.attainment), { sign: false }),
    ],
    selected: r.selected,
  }));

  const scope = atPortfolio
    ? "Regions"
    : `Markets · ${entityName(ds, { kind: "region", regionId: ctx.region! })}`;
  const peers = byName.length;
  return {
    title: `${scope} compared`,
    subtitle: atPortfolio
      ? `Regions · five axes, scaled across all ${peers} regions`
      : `${entityName(ds, { kind: "region", regionId: ctx.region! })} · five axes, scaled across all ${peers} markets`,
    caption: `${formatPeriod(ctx.period)} · ${atPortfolio ? DERIVED : "Attainment and growth derived · share given"}`,
    axes: atPortfolio ? RADAR_AXES_DERIVED : RADAR_AXES_GIVEN,
    series,
  };
}

function heatMapVM(ds: Dataset, ctx: Context): HeatMapVM {
  const markets = marketsByRevenue(ds, peerMarkets(ds, ctx), ctx.period).map(({ m }) => m);
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
    subtitle: `${ctx.region ? scope : "All markets"} · ${formatPeriod(periods[0] ?? "")} – ${formatPeriod(periods[periods.length - 1] ?? "")} · % of forecast`,
    caption: `Sorted by revenue · ${DERIVED}`,
    periods,
    rows,
    selected: ctx.market ? { market: ctx.market, period: ctx.period } : undefined,
  };
}

export function analystVM(ds: Dataset, ctx: Context): AnalystVM {
  return {
    statusRule: STATUS_RULE_TEXT,
    basis: effectiveBasis(ds, ctx.basis, ctx.period),
    matDisabled: periodIndex(ds, ctx.period) < 11,
    grid: gridVM(ds, ctx),
    timeSeries: timeSeriesVM(ds, ctx),
    radar: radarVM(ds, ctx),
    heatMap: heatMapVM(ds, ctx),
  };
}
