import {
  STATUS_LABEL,
  askWhyPrompt,
  attentionCount,
  SOURCE_CONTINUED,
  derivedLabel,
  sourceLabel,
  statusForDerived,
  effectiveBasis,
  entityName,
  entityOf,
  kpiFor,
  marketsIn,
  momChangePct,
  statusCounts,
  type Context,
  type Dataset,
  type Entity,
  type Market,
  type Metric,
  type Period,
  type RegionId,
  type Status,
} from "@/domain";
import type { PanelContext } from "@/features/assistant/EmptyState";
import {
  formatCount,
  formatMonthName,
  formatMoneyCompact,
  formatMoneyFull,
  formatOneDecimal,
  formatPct,
  formatPeriod,
  formatPeriodAbbr,
} from "@/lib/format";

export type KpiTileVM = {
  label: string;
  /** For a tile too narrow for `label`. */
  shortLabel?: string;
  headline: string;
  delta: { direction: "up" | "down" | "flat"; value: string; comparison: string };
  provenance: string;
  /** What the figure is and how it is computed: the first lines of the info popover. */
  definition: string;
  /** Accessible name of the info button, in sentence case, for example "About Germany revenue". */
  infoLabel: string;
  /** The status tile shows this status as a badge, labelled with `headline`, in place of a figure. */
  status?: Status;
  trend?: { actual: number[]; forecast: number[]; label: string };
};

export type MapRowVM = {
  id: string;
  name: string;
  region: string;
  status: Status;
  statusLabel: string;
  attainment: string;
  revenue: string;
  growth: string;
};

export type MapValueVM = {
  name: string;
  value: number;
  label: string;
  status: Status;
  statusLabel: string;
  display: string;
  revenue: string;
};

export type OverviewVM = {
  /** Entity in view and its caption, for the title row above the tiles. */
  title: string;
  caption: string;
  tiles: KpiTileVM[];
  /** One line for the whole KPI strip: where its four figures come from. */
  tilesProvenance: string;
  map: {
    metric: Metric;
    selected: string | undefined;
    /** Markets drawn at full strength; everything else is dimmed. Undefined at portfolio level. */
    focus: string[] | undefined;
    periodLabel: string;
    /** A product is selected but the map still shows every product. */
    allProducts: boolean;
    /** The Executive card's subtitle, scope included. */
    subtitle: string;
    /** The Analyst section's subtitle, scope included. */
    sheetSubtitle: string;
    /** Where the figures come from, for the table caption. */
    provenance: string;
    maxRevenue: number;
    values: Record<string, MapValueVM>;
    rows: MapRowVM[];
  };
};

const BASIS_LABEL = { month: "Month", ytd: "YTD", mat: "MAT" } as const;

/** True when the view includes the latest month, the only one live mode moves. */
const atLatest = (ds: Dataset, ctx: Context) => ctx.period === ds.meta.latestPeriod;

const direction = (n: number): "up" | "down" | "flat" => (n > 0 ? "up" : n < 0 ? "down" : "flat");

function sameMonthLastYear(period: Period): string {
  const [y, m] = period.split("-") as [string, string];
  return `${Number(y) - 1}-${m}`;
}

const signedMoney = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatMoneyCompact(Math.abs(n))}`;

function basisFor(ds: Dataset, ctx: Context) {
  return ctx.mode === "analyst" ? effectiveBasis(ds, ctx.basis, ctx.period) : "month";
}

function revenueTrend(
  ds: Dataset,
  entity: Entity,
  period: Period,
): NonNullable<KpiTileVM["trend"]> {
  const markets = new Set(marketsIn(ds, entity).map((m) => m.id));
  const productId = entity.kind === "product" ? entity.productId : undefined;
  const series = monthlySeries(
    ds,
    period,
    24,
    (m, p) => markets.has(m) && (productId === undefined || p === productId),
  );
  const latest = series.actual[series.actual.length - 1] ?? 0;
  return {
    ...series,
    label: `${series.actual.length}-month revenue trend, latest ${formatMoneyCompact(latest)}`,
  };
}

/** The scope a card states when a product is selected and the card still shows every product. */
export const ALL_PRODUCTS = "All products";

function tilesFor(ds: Dataset, ctx: Context): { tiles: KpiTileVM[]; provenance: string } {
  const entity = entityOf(ctx);
  const basis = basisFor(ds, ctx);
  const k = kpiFor(ds, entity, ctx.period, basis);
  const ytd = kpiFor(ds, entity, ctx.period, "ytd");
  const latest = atLatest(ds, ctx);
  const provenance = k.provenance === "source" ? sourceLabel(ds, latest) : derivedLabel(ds, latest);
  const name = entityName(ds, entity).toUpperCase();
  const prior = formatPeriod(sameMonthLastYear(ctx.period));
  const year = Number(ctx.period.slice(0, 4));

  const revenue: KpiTileVM = {
    label: entity.kind === "portfolio" ? "PORTFOLIO REVENUE" : `${name} REVENUE`,
    shortLabel: "REVENUE",
    headline: formatMoneyCompact(k.totals.actual),
    delta: {
      direction: direction(k.growthPct),
      value: formatPct(k.growthPct, { sign: true }),
      comparison: `vs ${prior}`,
    },
    provenance,
    definition: "Actual revenue for the selected scope and period.",
    infoLabel: `About ${entity.kind === "portfolio" ? "portfolio" : entityName(ds, entity)} revenue`,
    trend: revenueTrend(ds, entity, ctx.period),
  };
  const attainment: KpiTileVM = {
    label: "FORECAST ATTAINMENT",
    shortLabel: "ATTAINMENT",
    headline: formatPct(k.attainmentPct, { sign: false }),
    delta: {
      direction: direction(k.variance),
      value: signedMoney(k.variance),
      comparison: "vs forecast",
    },
    provenance,
    definition: "Actual revenue as a share of forecast. Attainment = actual ÷ forecast.",
    infoLabel: "About forecast attainment",
  };
  const growth: KpiTileVM = {
    label: "GROWTH, YEAR ON YEAR",
    shortLabel: "GROWTH YOY",
    headline: formatPct(k.growthPct, { sign: true }),
    delta: {
      direction: direction(k.growthPct),
      value: `YTD ${formatPct(ytd.growthPct, { sign: true })}`,
      comparison: `vs ${year - 1}`,
    },
    provenance,
    definition: "Revenue against the same period last year. Growth = actual ÷ prior year − 1.",
    infoLabel: "About year-on-year growth",
  };

  const inScope = marketsIn(ds, entity);
  let attention: KpiTileVM;
  const only = inScope[0];
  if (inScope.length === 1 && only) {
    attention = {
      label: "STATUS",
      headline: STATUS_LABEL[only.kpis.status],
      status: only.kpis.status,
      delta: {
        direction: "flat",
        value: `Attainment ${formatPct(k.attainmentPct, { sign: false })} · Growth ${formatPct(k.growthPct, { sign: true })}`,
        comparison: "",
      },
      provenance: sourceLabel(ds, latest),
      definition: "The status the data file gives this market.",
      infoLabel: "About status",
    };
  } else {
    const c = statusCounts(ds, entity);
    attention = {
      label: "NEEDS ATTENTION",
      headline: formatCount(attentionCount(ds, entity), inScope.length),
      delta: {
        direction: "flat",
        value: `${c.at_risk} at risk · ${c.off_track} off track`,
        comparison: "",
      },
      provenance: sourceLabel(ds, latest),
      definition: "Markets the data file marks at risk or off track.",
      infoLabel: "About markets needing attention",
    };
  }
  const given = sourceLabel(ds, latest);
  // The three figures are sums (or given, at a single market); the fourth is always the file's own count.
  const line = revenue.provenance === given ? given : `${revenue.provenance} · ${SOURCE_CONTINUED}`;
  return { tiles: [revenue, attainment, growth, attention], provenance: line };
}

export function overviewVM(ds: Dataset, ctx: Context): OverviewVM {
  const basis = basisFor(ds, ctx);
  const matFallback = ctx.mode === "analyst" && ctx.basis === "mat" && basis === "month";
  const regionName = new Map(ds.regions.map((r) => [r.id, r.name]));
  const strip = tilesFor(ds, ctx);

  const entries = ds.markets.map((m) => {
    const k = kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, basis);
    return { m, k };
  });

  // Only Analyst has a metric control, so the executive map always reads attainment.
  const metric = ctx.mode === "analyst" ? ctx.metric : "attainment";
  const suffix =
    metric === "attainment" ? "attainment" : metric === "revenue" ? "revenue" : "growth";
  const values: OverviewVM["map"]["values"] = {};
  for (const { m, k } of entries) {
    const display =
      metric === "attainment"
        ? formatPct(k.attainmentPct, { sign: false })
        : metric === "revenue"
          ? formatMoneyCompact(k.totals.actual)
          : formatPct(k.growthPct, { sign: true });
    const value =
      metric === "attainment"
        ? k.attainmentPct
        : metric === "revenue"
          ? k.totals.actual
          : k.growthPct;
    values[m.id] = {
      name: m.name,
      value,
      label: `${display} ${suffix}`,
      status: m.kpis.status,
      statusLabel: STATUS_LABEL[m.kpis.status],
      display,
      revenue: formatMoneyCompact(k.totals.actual),
    };
  }

  const rows: MapRowVM[] = entries
    .map(({ m, k }) => ({
      id: m.id,
      name: m.name,
      region: regionName.get(m.regionId) ?? m.regionId,
      status: m.kpis.status,
      statusLabel: STATUS_LABEL[m.kpis.status],
      attainment: formatPct(k.attainmentPct, { sign: false }),
      revenue: formatMoneyFull(k.totals.actual),
      growth: formatPct(k.growthPct, { sign: true }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // A market always carries its region (invariants), so the region's markets cover both cases.
  const focus = ctx.region
    ? ds.markets.filter((m) => m.regionId === ctx.region).map((m) => m.id)
    : undefined;

  return {
    title: entityName(ds, entityOf(ctx)),
    caption: `${formatPeriod(ctx.period)} · ${BASIS_LABEL[basis]}${matFallback ? " · MAT unavailable, showing Month" : ""}`,
    tiles: strip.tiles,
    tilesProvenance: strip.provenance,
    map: {
      metric,
      selected: ctx.market,
      focus,
      periodLabel: formatPeriod(ctx.period),
      allProducts: Boolean(ctx.product),
      subtitle: `${ctx.product ? `${ALL_PRODUCTS} · ` : ""}${formatPeriod(ctx.period)} · click a market to drill`,
      sheetSubtitle: `Markets by ${suffix} · ${ctx.product ? `${ALL_PRODUCTS} · ` : ""}${formatPeriod(ctx.period)}`,
      provenance: sourceLabel(ds, atLatest(ds, ctx)),
      maxRevenue: Math.max(...entries.map((e) => e.k.totals.actual)),
      values,
      rows,
    },
  };
}

// ---------------------------------------------------------------------------------------------
// Verdict, status strip, attention list, region bars and the panel's "What changed" line.
// Everything below is derived from `kpiFor` and the markets' given status; nothing is AI-written.
// ---------------------------------------------------------------------------------------------

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** One to twelve are spelled out in prose; larger counts stay digits. */
const spell = (n: number): string => NUMBER_WORDS[n] ?? String(n);
const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_PHRASE: Record<Status, string> = {
  on_track: "on track",
  at_risk: "at risk",
  off_track: "off track",
};

const STATUS_ORDER: Record<Status, number> = { off_track: 0, at_risk: 1, on_track: 2 };

const REGION_ADJECTIVE: Record<RegionId, string> = {
  na: "North American",
  eu: "European",
  apac: "APAC",
  latam: "LATAM",
};

export type VerdictSegment = {
  text: string;
  role: "plain" | "status" | "attention" | "number";
};

export type VerdictVM = {
  eyebrow: string;
  /** The dataset's latest period, for the "Data through" line a phone shows under the eyebrow. */
  latestPeriod: string;
  caption: string;
  segments: VerdictSegment[];
  status: Status;
  /** Colour of the attention phrase; "none" when no market needs attention or the scope is one market. */
  attention: "bad" | "warn" | "none";
};

function joinSegments(parts: VerdictSegment[]): VerdictSegment[] {
  const out: VerdictSegment[] = [];
  for (const part of parts) {
    const last = out[out.length - 1];
    if (last && last.role === "plain" && part.role === "plain") last.text += part.text;
    else out.push({ ...part });
  }
  return out;
}

const plain = (text: string): VerdictSegment => ({ text, role: "plain" });
const num = (text: string): VerdictSegment => ({ text, role: "number" });

function marketOf(ds: Dataset, entity: Entity): Market | undefined {
  return entity.kind === "market" ? ds.markets.find((m) => m.id === entity.marketId) : undefined;
}

/** The sentence the exec reads first. A market uses its given status; a portfolio or region derives one. */
export function verdictVM(ds: Dataset, ctx: Context): VerdictVM {
  const entity = entityOf(ctx);
  const k = kpiFor(ds, entity, ctx.period, "month");
  const market = marketOf(ds, entity);
  const status = market ? market.kpis.status : statusForDerived(k.attainmentPct, k.growthPct);

  const growth =
    k.growthPct === 0
      ? [plain("flat on last year")]
      : [
          plain(k.growthPct > 0 ? "up " : "down "),
          num(formatPct(Math.abs(k.growthPct), { sign: false })),
          plain(" on last year"),
        ];

  const parts: VerdictSegment[] = [
    plain(`${entityName(ds, entity)} is `),
    { text: STATUS_PHRASE[status], role: "status" },
    plain(" at "),
    num(formatPct(k.attainmentPct, { sign: false })),
    plain(" of forecast, "),
    ...growth,
    plain("."),
  ];

  let attention: VerdictVM["attention"] = "none";
  if (entity.kind === "portfolio" || entity.kind === "region") {
    const counts = statusCounts(ds, entity);
    const n = counts.at_risk + counts.off_track;
    attention = counts.off_track > 0 ? "bad" : counts.at_risk > 0 ? "warn" : "none";
    const phrase =
      n === 0
        ? "No markets need attention"
        : n === 1
          ? "One market needs attention"
          : `${capitalise(spell(n))} markets need attention`;
    parts.push(plain(" "), { text: phrase, role: n === 0 ? "plain" : "attention" }, plain("."));
  }

  const dip = market?.kpis.anomalies.find((a) => a.type === "dip");
  if (market && dip) {
    const mom = momChangePct(ds, entity, dip.period);
    if (mom !== undefined) {
      parts.push(
        plain(" Revenue fell "),
        num(formatPct(Math.abs(mom), { sign: false })),
        plain(` in ${formatMonthName(dip.period)}.`),
      );
    }
  }

  return {
    eyebrow:
      `${entityName(ds, entity)} · ${formatPeriod(ctx.period)} · ${BASIS_LABEL.month}`.toUpperCase(),
    latestPeriod: ds.meta.latestPeriod,
    caption: market ? sourceLabel(ds, atLatest(ds, ctx)) : derivedLabel(ds, atLatest(ds, ctx)),
    segments: joinSegments(parts),
    status,
    attention,
  };
}

export type StripChipVM = { id: string; name: string; status: Status; statusLabel: string };
export type StripGroupVM = {
  id: RegionId;
  name: string;
  count: number;
  /** Derived with the published rule from the region's figures. */
  status: Status;
  statusLabel: string;
  markets: StripChipVM[];
};

/**
 * Off track and at risk markets first, lowest attainment first; on-track markets keep dataset order.
 * One comparator for the strip and the attention list so both always agree.
 */
function compareByStatus(
  a: { status: Status; attainment: number },
  b: { status: Status; attainment: number },
): number {
  const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
  if (byStatus !== 0) return byStatus;
  return a.status === "on_track" ? 0 : a.attainment - b.attainment;
}

/** Every market in scope as a chip, grouped by region. Empty at market scope, where the strip is hidden. */
export function stripVM(ds: Dataset, ctx: Context): StripGroupVM[] {
  if (ctx.market) return [];
  return ds.regions
    .filter((r) => !ctx.region || r.id === ctx.region)
    .map((r) => {
      const markets = ds.markets
        .filter((m) => m.regionId === r.id)
        .map((m) => ({
          status: m.kpis.status,
          attainment: kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, "month")
            .attainmentPct,
          chip: {
            id: m.id,
            name: m.name,
            status: m.kpis.status,
            statusLabel: STATUS_LABEL[m.kpis.status],
          },
        }))
        .sort(compareByStatus)
        .map((m) => m.chip);
      const k = kpiFor(ds, { kind: "region", regionId: r.id }, ctx.period, "month");
      const status = statusForDerived(k.attainmentPct, k.growthPct);
      return {
        id: r.id,
        name: r.name,
        count: markets.length,
        status,
        statusLabel: STATUS_LABEL[status],
        markets,
      };
    });
}

/** The last `count` months of the dataset up to and including `period`, oldest first. */
function trailingPeriods(ds: Dataset, period: Period, count: number): Period[] {
  return ds.meta.periods.filter((p) => p <= period).slice(-count);
}

/** Actual and forecast revenue per month, oldest first, ending at `period`, for at most `count` months. */
function monthlySeries(
  ds: Dataset,
  period: Period,
  count: number,
  include: (marketId: string, productId: string) => boolean,
): { actual: number[]; forecast: number[] } {
  const months = trailingPeriods(ds, period, count);
  const sums = new Map(months.map((p) => [p, { actual: 0, forecast: 0 }]));
  for (const f of ds.series) {
    const sum = sums.get(f.period);
    if (sum && include(f.marketId, f.productId)) {
      sum.actual += f.actual;
      sum.forecast += f.forecast;
    }
  }
  const rows = months.map((p) => sums.get(p) ?? { actual: 0, forecast: 0 });
  return { actual: rows.map((r) => r.actual), forecast: rows.map((r) => r.forecast) };
}

const lastTwelveActuals = (
  ds: Dataset,
  period: Period,
  include: (marketId: string, productId: string) => boolean,
) => monthlySeries(ds, period, 12, include).actual;

export type AttentionRowVM = {
  id: string;
  name: string;
  region: string;
  status: Status;
  statusLabel: string;
  attainment: string;
  growth: string;
  growthPct: number;
  spark: number[];
  sparkLabel: string;
};

export type RankedRowVM = AttentionRowVM & {
  rank: number;
  askWhy: { aria: string; text: string };
};

export type ProductRowVM = {
  id: string;
  name: string;
  revenue: string;
  attainment: string;
  growth: string;
  growthPct: number;
  spark: number[];
  sparkLabel: string;
};

export type AttentionVM =
  | {
      kind: "markets";
      caption: string;
      provenance: string;
      rows: RankedRowVM[];
      rising: AttentionRowVM[];
      falling: AttentionRowVM[];
      /** The window every sparkline in the list covers, e.g. "12 months · Jun 2025 – May 2026". */
      sparkCaption: string;
    }
  | { kind: "products"; caption: string; rows: ProductRowVM[] };

/** Markets that need attention, worst first, then the three fastest-growing markets of any status. */
export function attentionVM(ds: Dataset, ctx: Context): AttentionVM {
  const regionName = new Map(ds.regions.map((r) => [r.id, r.name]));
  const period = formatPeriod(ctx.period);

  if (ctx.market) {
    const marketId = ctx.market;
    const rows = ds.products.map((p) => {
      const k = kpiFor(ds, { kind: "product", marketId, productId: p.id }, ctx.period, "month");
      const spark = lastTwelveActuals(ds, ctx.period, (m, prod) => m === marketId && prod === p.id);
      return {
        id: p.id,
        name: p.name,
        revenue: formatMoneyCompact(k.totals.actual),
        attainment: formatPct(k.attainmentPct, { sign: false }),
        growth: formatPct(k.growthPct, { sign: true }),
        growthPct: k.growthPct,
        spark,
        sparkLabel: `${p.name}, revenue, last 12 months`,
      };
    });
    return {
      kind: "products",
      caption: `${derivedLabel(ds, atLatest(ds, ctx))} · ${period}`,
      rows,
    };
  }

  const scoped = marketsIn(ds, entityOf(ctx)).map((m) => {
    const k = kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, "month");
    const row: AttentionRowVM = {
      id: m.id,
      name: m.name,
      region: regionName.get(m.regionId) ?? m.regionId,
      status: m.kpis.status,
      statusLabel: STATUS_LABEL[m.kpis.status],
      attainment: formatPct(k.attainmentPct, { sign: false }),
      growth: formatPct(k.growthPct, { sign: true }),
      growthPct: k.growthPct,
      spark: lastTwelveActuals(ds, ctx.period, (marketId) => marketId === m.id),
      sparkLabel: `${m.name}, revenue, last 12 months`,
    };
    return { market: m, row, attainment: k.attainmentPct };
  });

  const rows = scoped
    .filter((s) => s.row.status !== "on_track")
    .sort((a, b) =>
      compareByStatus(
        { ...a.row, attainment: a.attainment },
        { ...b.row, attainment: b.attainment },
      ),
    )
    .map((s, i) => ({
      ...s.row,
      rank: i + 1,
      askWhy: askWhyPrompt(s.market),
    }));

  // A market is only ever in one column: up on last year, or down on it. Flat markets are in neither.
  const rising = scoped
    .filter((s) => s.row.growthPct > 0)
    .sort((a, b) => b.row.growthPct - a.row.growthPct)
    .slice(0, 3)
    .map((s) => s.row);
  const falling = scoped
    .filter((s) => s.row.growthPct < 0)
    .sort((a, b) => a.row.growthPct - b.row.growthPct)
    .slice(0, 3)
    .map((s) => s.row);
  const sparkMonths = trailingPeriods(ds, ctx.period, 12);

  return {
    kind: "markets",
    caption: `Off track first, then at risk by attainment · ${
      ctx.region
        ? `${entityName(ds, { kind: "region", regionId: ctx.region })} markets`
        : "All markets"
    } · ${period}`,
    provenance: sourceLabel(ds, atLatest(ds, ctx)),
    rows,
    rising,
    falling,
    sparkCaption: `${sparkMonths.length} months · ${formatPeriodAbbr(sparkMonths[0] ?? ctx.period)} – ${formatPeriodAbbr(sparkMonths[sparkMonths.length - 1] ?? ctx.period)}`,
  };
}

export type RegionBarVM = {
  id: RegionId;
  name: string;
  revenue: string;
  attainmentPct: number;
  attainment: string;
  status: Status;
  statusLabel: string;
};

export type RegionBarsVM = {
  rows: RegionBarVM[];
  /** `lead` is set in bold, `rest` follows it. Together they read as one sentence. */
  sentence: { lead: string; rest: string };
  caption: string;
  /** A product is selected but the regions are shown across all products. */
  allProducts: boolean;
  subtitle: string;
};

/** Revenue and attainment per region, with one derived sentence about the weakest (or leading) region. */
export function regionBarsVM(ds: Dataset, ctx: Context): RegionBarsVM {
  const rows = ds.regions.map((r) => {
    const k = kpiFor(ds, { kind: "region", regionId: r.id }, ctx.period, "month");
    const status = statusForDerived(k.attainmentPct, k.growthPct);
    return {
      id: r.id,
      name: r.name,
      revenue: formatMoneyCompact(k.totals.actual),
      attainmentPct: k.attainmentPct,
      attainment: formatPct(k.attainmentPct, { sign: false }),
      status,
      statusLabel: STATUS_LABEL[status],
    };
  });

  const lowest = rows.reduce((a, b) => (b.attainmentPct < a.attainmentPct ? b : a));
  let sentence: RegionBarsVM["sentence"];
  if (lowest.attainmentPct < 100) {
    const inRegion = ds.markets.filter((m) => m.regionId === lowest.id);
    const flagged = inRegion.filter((m) => m.kpis.status !== "on_track").length;
    const share =
      flagged === inRegion.length
        ? `All ${spell(flagged)}`
        : `${capitalise(spell(flagged))} of ${spell(inRegion.length)}`;
    const gap = formatOneDecimal(100 - lowest.attainmentPct);
    sentence = {
      lead: `${lowest.name} is the drag.`,
      rest: ` ${share} ${REGION_ADJECTIVE[lowest.id]} markets are flagged, and its attainment is ${gap} points under forecast.`,
    };
  } else {
    const best = rows.reduce((a, b) => (b.attainmentPct > a.attainmentPct ? b : a));
    sentence = { lead: `${best.name} leads`, rest: ` at ${best.attainment} of forecast.` };
  }
  return {
    rows,
    sentence,
    caption: derivedLabel(ds, atLatest(ds, ctx)),
    allProducts: Boolean(ctx.product),
    subtitle: ctx.product
      ? `${ALL_PRODUCTS} · vs forecast, 100% at centre`
      : "Attainment vs forecast · 100% at centre",
  };
}

/** The market in scope furthest from plan, as one sentence for the panel's empty state. */
export function whatChangedVM(ds: Dataset, ctx: Context): { text: string } {
  const candidates = marketsIn(ds, entityOf(ctx)).map((market) => ({
    market,
    k: kpiFor(ds, { kind: "market", marketId: market.id }, ctx.period, "month"),
  }));
  const furthest = candidates.reduce((a, b) =>
    Math.abs(b.k.attainmentPct - 100) > Math.abs(a.k.attainmentPct - 100) ? b : a,
  );
  const { market, k } = furthest;
  let text = `${market.name} is furthest from plan: ${formatPct(k.attainmentPct, { sign: false })} of forecast and ${formatPct(k.growthPct, { sign: true })} on last year`;
  const dip = market.kpis.anomalies.find((a) => a.type === "dip");
  const mom = dip
    ? momChangePct(ds, { kind: "market", marketId: market.id }, dip.period)
    : undefined;
  if (dip && mom !== undefined) {
    text += `, after a ${formatPct(Math.abs(mom), { sign: false })} drop in ${formatMonthName(dip.period)}`;
  }
  return { text: `${text}.` };
}

/** What the assistant panel's empty state says about the current view. */
export function panelContextVM(ds: Dataset, ctx: Context): PanelContext {
  return {
    about: `About ${entityName(ds, entityOf(ctx))} · ${formatPeriodAbbr(ctx.period)}`,
    whatChanged: whatChangedVM(ds, ctx).text,
  };
}
