import {
  attainmentPct,
  entityName,
  factsFor,
  momChangePct,
  previousPeriod,
  totals,
  type ChatContext,
  type Citation,
  type Dataset,
  type Entity,
  type Fixture,
  type FixturesFile,
  type Period,
} from "@/domain";
import { formatMoneyCompact, formatPct, formatPeriodAbbr } from "@/lib/format";

type MarketView = { entity: Extract<Entity, { kind: "market" }>; period: Period };

const marketView = (context?: ChatContext): MarketView | undefined =>
  context?.entity.kind === "market"
    ? { entity: context.entity, period: context.period }
    : undefined;

const hasKeyword = (fixture: Fixture, q: string) =>
  (fixture.keywords ?? []).some((k) => q.includes(k));

/** Whether the view the question was asked from is the one a fixture's scope is written for. */
function scopeFits(scope: NonNullable<Fixture["scope"]>, { entity }: ChatContext): boolean {
  if (scope.entity !== entity.kind) return false;
  switch (scope.entity) {
    case "portfolio":
      return true;
    case "region":
      return entity.kind === "region" && (!scope.regionId || scope.regionId === entity.regionId);
    case "market":
      return entity.kind === "market" && (!scope.marketId || scope.marketId === entity.marketId);
  }
}

/**
 * What is wrong with a view the request names, or undefined when every part of it is in the dataset. The
 * schema only checks shape; a market or month that does not exist would otherwise reach the arithmetic.
 */
export function contextProblem(ds: Dataset, { entity, period }: ChatContext): string | undefined {
  if (!ds.meta.periods.includes(period)) return `Unknown period ${period}`;
  if ((entity.kind === "market" || entity.kind === "product") && !hasMarket(ds, entity.marketId)) {
    return `Unknown market ${entity.marketId}`;
  }
  if (entity.kind === "product" && !ds.products.some((p) => p.id === entity.productId)) {
    return `Unknown product ${entity.productId}`;
  }
  return undefined;
}

const hasMarket = (ds: Dataset, id: string) => ds.markets.some((m) => m.id === id);

/**
 * The answer for a question. A scoped fixture that fits the view wins over an unscoped keyword match, then the
 * default. A market template stays out when the question names a different market than the one in view, and when
 * an unscoped fixture keyed on the market in view exists (Germany's curated answer is richer than the template).
 * The returned fixture has any template filled in.
 */
export function pickFixture(
  file: FixturesFile,
  ds: Dataset,
  question: string,
  context?: ChatContext,
): Fixture {
  const q = question.toLowerCase();
  const hits = file.fixtures.filter((f) => hasKeyword(f, q));
  const view = marketView(context);
  const scoped = context
    ? hits.find(
        (f) =>
          f.scope !== undefined &&
          scopeFits(f.scope, context) &&
          (f.template === undefined || (view && templateSuits(ds, q, hits, view))),
      )
    : undefined;
  const fixture = scoped ?? hits.find((f) => f.scope === undefined) ?? file.default;
  // A template always comes from a scoped match, which needs a market view; the default is the unreachable fallback.
  if (fixture.template === undefined) return fixture;
  return view ? fillMarketMonth(ds, fixture, view) : file.default;
}

function templateSuits(
  ds: Dataset,
  q: string,
  hits: readonly Fixture[],
  { entity }: MarketView,
): boolean {
  const inView = ds.markets.find((m) => m.id === entity.marketId);
  if (!inView) return false;
  const name = inView.name.toLowerCase();
  const namesOther = ds.markets.some((m) => m !== inView && q.includes(m.name.toLowerCase()));
  const curated = hits.some(
    (h) => h.scope === undefined && (h.keywords ?? []).some((k) => name.includes(k)),
  );
  return !namesOther && !curated;
}

/**
 * Writes the market-month template's text and citations from data.json. This is the only "intelligence" in the
 * mock: numbers are read and formatted, nothing is generated.
 */
function fillMarketMonth(ds: Dataset, fixture: Fixture, { entity, period }: MarketView): Fixture {
  const t = totals(factsFor(ds, { entity, periods: [period] }));
  const name = entityName(ds, entity);
  const previous = previousPeriod(ds, period);
  const mom = momChangePct(ds, entity, period);
  // At the latest month the dashboard shows the market's own KPI, so the answer quotes that, not a recomputation.
  const kpi = ds.markets.find((m) => m.id === entity.marketId)?.kpis.forecastAttainmentPct;
  const attainment = period === ds.meta.latestPeriod && kpi !== undefined ? kpi : attainmentPct(t);

  const values: Record<string, string> = {
    market: name,
    period: formatPeriodAbbr(period),
    actual: formatMoneyCompact(t.actual),
    forecast: formatMoneyCompact(t.forecast),
    attainment: formatPct(attainment, { sign: false }),
    mom: mom === undefined ? "" : `; ${formatPct(mom, { sign: true })} on the previous month`,
  };
  // A function replacer keeps "$" in the values (money) from being read as a replacement pattern.
  const text = fixture.answer.text.replace(
    /\{(\w+)\}/g,
    (whole, key: string) => values[key] ?? whole,
  );

  const cite = (p: typeof period): Citation => ({
    marketId: entity.marketId,
    period: p,
    label: `${name}, ${formatPeriodAbbr(p)}`,
  });
  const citations = previous === undefined ? [cite(period)] : [cite(period), cite(previous)];
  return { ...fixture, answer: { ...fixture.answer, text, citations } };
}
