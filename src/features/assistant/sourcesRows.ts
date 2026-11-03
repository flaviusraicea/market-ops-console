import {
  STATUS_LABEL,
  attainmentPct,
  entityName,
  factsFor,
  momChangePct,
  previousPeriod,
  totals,
  latestPeriod,
  type Dataset,
  type Entity,
  type Period,
} from "@/domain";
import { formatMoneyCompact, formatMonthShort, formatPct } from "@/lib/format";
import type { Resolved } from "./useAnswerMachine";

/** Per-answer wording that is not in the citation itself. In slice 6 `inlineMap.ts` supplies it per fixture. */
export type SourcesMeta = {
  /** Add the market revenue to rows at the latest period (the forecast-miss answer). */
  withRevenue?: boolean;
  /** Same order as the citations. Missing entries fall back to the citation label and an empty echo. */
  items: ReadonlyArray<{ claim?: string; assistantWord: string }>;
};

export type SourceRow = {
  claim: string;
  entity: string;
  period: string;
  sourceValue: string;
  assistant: string;
  disagreement: boolean;
  resolved: boolean;
  /** True when the source value is computed from monthly facts rather than read from the market's KPIs. */
  derived: boolean;
};

const DASH = "—";

/** Whole-number change with a real minus sign: -27.2 becomes "−27%". */
const signedWhole = (n: number) => {
  const r = Math.round(n);
  return `${r < 0 ? "−" : r > 0 ? "+" : ""}${Math.abs(r)}%`;
};

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** One row per citation, every figure read from the dataset (data.json), never from the assistant. */
export function sourcesRows(
  ds: Dataset,
  citations: readonly Resolved[],
  meta: SourcesMeta,
): { rows: SourceRow[]; caption: string } {
  const rows = citations.map(({ citation, resolution }, i): SourceRow => {
    const item = meta.items[i];
    if (!resolution.ok) {
      return {
        claim: citation.label ?? DASH,
        entity: "Could not resolve",
        period: DASH,
        sourceValue: DASH,
        assistant: citation.label ?? DASH,
        disagreement: false,
        resolved: false,
        derived: false,
      };
    }
    const { entity, period, label } = resolution.target;
    return {
      claim: item?.claim ?? label,
      entity: entityName(ds, entity),
      period: resolution.target.periodDefaulted ? `${period} (latest)` : period,
      sourceValue: sourceValue(ds, entity, period, meta.withRevenue ?? false),
      derived: !isDashboardKpi(ds, entity, period),
      assistant: resolution.disagreement
        ? upperFirst(resolution.disagreement.assistant)
        : (item?.assistantWord ?? DASH),
      disagreement: resolution.disagreement !== undefined,
      resolved: true,
    };
  });
  const broken = rows.filter((r) => !r.resolved).length;
  const note =
    broken === 0
      ? ""
      : ` · ${broken} ${broken === 1 ? "citation" : "citations"} could not be resolved`;
  const derived = rows.some((r) => r.derived) ? " · derived" : "";
  return { rows, caption: `Sources · data.json · attainment as given${derived}${note}` };
}

/** True when the value is the dashboard's own precomputed market KPIs (latest period), not derived from facts. */
function isDashboardKpi(ds: Dataset, entity: Entity, period: Period): boolean {
  return entity.kind === "market" && period === latestPeriod(ds);
}

function sourceValue(ds: Dataset, entity: Entity, period: Period, withRevenue: boolean): string {
  const market =
    entity.kind === "portfolio" || entity.kind === "region"
      ? undefined
      : ds.markets.find((m) => m.id === entity.marketId);

  // The dashboard's own number: the precomputed market KPIs at the latest period.
  if (entity.kind === "market" && market && period === latestPeriod(ds)) {
    const base = `${STATUS_LABEL[market.kpis.status]} · ${formatPct(market.kpis.forecastAttainmentPct, { sign: false })} attainment`;
    return withRevenue ? `${base} · ${formatMoneyCompact(market.kpis.revenue)}` : base;
  }

  const t = totals(factsFor(ds, { entity, periods: [period] }));
  if (t.forecast === 0) return DASH; // no monthly facts for this target; never divide by zero
  const base = `${formatMoneyCompact(t.actual)} actual · ${formatPct(attainmentPct(t), { sign: false })} of forecast`;
  const anomaly = market?.kpis.anomalies.find((a) => a.period === period);
  const prev = previousPeriod(ds, period);
  if (anomaly && entity.kind === "market" && prev) {
    const mom = momChangePct(ds, entity, period);
    if (mom !== undefined)
      return `${base} · ${signedWhole(mom)} vs ${formatMonthShort(prev)} (anomaly note)`;
  }
  return base;
}
