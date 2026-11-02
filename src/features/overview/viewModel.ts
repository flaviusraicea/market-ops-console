import {
  STATUS_LABEL,
  attentionCount,
  entityName,
  entityOf,
  kpiFor,
  marketsIn,
  statusCounts,
  type Context,
  type Dataset,
  type Metric,
  type Period,
  type Status,
} from "@/domain";
import {
  formatCount,
  formatMoneyCompact,
  formatMoneyFull,
  formatPct,
  formatPeriod,
} from "@/lib/format";

export type KpiTileVM = {
  label: string;
  headline: string;
  delta: { direction: "up" | "down" | "flat"; value: string; comparison: string };
  provenance: string;
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

export type MoverVM = { id: string; name: string; status: Status; growth: number; display: string };

export type OverviewVM = {
  tiles: KpiTileVM[];
  map: {
    metric: Metric;
    selected: string | undefined;
    periodLabel: string;
    provenance: string;
    maxRevenue: number;
    values: Record<string, MapValueVM>;
    rows: MapRowVM[];
  };
  movers: { period: string; rising: MoverVM[]; falling: MoverVM[] };
};

const SOURCE = "Source · data.json";
const DERIVED = "Derived · sum of series";

const direction = (n: number): "up" | "down" | "flat" => (n > 0 ? "up" : n < 0 ? "down" : "flat");

function sameMonthLastYear(period: Period): string {
  const [y, m] = period.split("-") as [string, string];
  return `${Number(y) - 1}-${m}`;
}

const signedMoney = (n: number) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${formatMoneyCompact(Math.abs(n))}`;

function tilesFor(ds: Dataset, ctx: Context): KpiTileVM[] {
  const entity = entityOf(ctx);
  const basis = ctx.mode === "analyst" ? ctx.basis : "month";
  const k = kpiFor(ds, entity, ctx.period, basis);
  const ytd = kpiFor(ds, entity, ctx.period, "ytd");
  const provenance = k.provenance === "source" ? SOURCE : DERIVED;
  const name = entityName(ds, entity).toUpperCase();
  const prior = formatPeriod(sameMonthLastYear(ctx.period));
  const year = Number(ctx.period.slice(0, 4));

  const revenue: KpiTileVM = {
    label: entity.kind === "portfolio" ? "PORTFOLIO REVENUE" : `${name} REVENUE`,
    headline: formatMoneyCompact(k.totals.actual),
    delta: {
      direction: direction(k.growthPct),
      value: formatPct(k.growthPct, { sign: true }),
      comparison: `vs ${prior}`,
    },
    provenance,
  };
  const attainment: KpiTileVM = {
    label: "FORECAST ATTAINMENT",
    headline: formatPct(k.attainmentPct, { sign: false }),
    delta: {
      direction: direction(k.variance),
      value: signedMoney(k.variance),
      comparison: "vs forecast",
    },
    provenance,
  };
  const growth: KpiTileVM = {
    label: "GROWTH, YEAR ON YEAR",
    headline: formatPct(k.growthPct, { sign: true }),
    delta: {
      direction: direction(k.growthPct),
      value: `YTD ${formatPct(ytd.growthPct, { sign: true })}`,
      comparison: `vs ${year - 1}`,
    },
    provenance,
  };

  const inScope = marketsIn(ds, entity);
  let attention: KpiTileVM;
  const only = inScope[0];
  if (inScope.length === 1 && only) {
    attention = {
      label: "STATUS",
      headline: STATUS_LABEL[only.kpis.status],
      delta: {
        direction: "flat",
        value: `Attainment ${formatPct(k.attainmentPct, { sign: false })} · Growth ${formatPct(k.growthPct, { sign: true })}`,
        comparison: "",
      },
      provenance: SOURCE,
    };
  } else {
    const c = statusCounts(ds, entity);
    attention = {
      label: "MARKETS NEEDING ATTENTION",
      headline: formatCount(attentionCount(ds, entity), inScope.length),
      delta: {
        direction: "flat",
        value: `${c.at_risk} at risk · ${c.off_track} off track`,
        comparison: "",
      },
      provenance: SOURCE,
    };
  }
  return [revenue, attainment, growth, attention];
}

export function overviewVM(ds: Dataset, ctx: Context): OverviewVM {
  const basis = ctx.mode === "analyst" ? ctx.basis : "month";
  const regionName = new Map(ds.regions.map((r) => [r.id, r.name]));

  const entries = ds.markets.map((m) => {
    const k = kpiFor(ds, { kind: "market", marketId: m.id }, ctx.period, basis);
    return { m, k };
  });
  const allSource = entries.every((e) => e.k.provenance === "source");

  const values: OverviewVM["map"]["values"] = {};
  for (const { m, k } of entries) {
    const display =
      ctx.metric === "attainment"
        ? formatPct(k.attainmentPct, { sign: false })
        : ctx.metric === "revenue"
          ? formatMoneyCompact(k.totals.actual)
          : formatPct(k.growthPct, { sign: true });
    const value =
      ctx.metric === "attainment"
        ? k.attainmentPct
        : ctx.metric === "revenue"
          ? k.totals.actual
          : k.growthPct;
    const suffix =
      ctx.metric === "attainment" ? "attainment" : ctx.metric === "revenue" ? "revenue" : "growth";
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

  const byGrowth = entries.map(({ m, k }) => ({
    id: m.id,
    name: m.name,
    status: m.kpis.status,
    growth: k.growthPct,
    display: formatPct(k.growthPct, { sign: true }),
  }));
  const rising = [...byGrowth].sort((a, b) => b.growth - a.growth).slice(0, 3);
  const falling = [...byGrowth].sort((a, b) => a.growth - b.growth).slice(0, 3);

  return {
    tiles: tilesFor(ds, ctx),
    map: {
      metric: ctx.metric,
      selected: ctx.market,
      periodLabel: formatPeriod(ctx.period),
      provenance: allSource ? SOURCE : DERIVED,
      maxRevenue: Math.max(...entries.map((e) => e.k.totals.actual)),
      values,
      rows,
    },
    movers: { period: formatPeriod(ctx.period), rising, falling },
  };
}
