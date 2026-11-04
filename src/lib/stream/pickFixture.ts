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
  type Market,
  type Period,
  STATUS_LABEL,
  STATUS_RULE_TEXT,
} from "@/domain";
import { formatMoneyCompact, formatPct, formatPeriodAbbr } from "@/lib/format";
import { readQuestion } from "./horizon";

type MarketView = { entity: Extract<Entity, { kind: "market" }>; period: Period };
type Periods = readonly [Period, ...Period[]];

const marketView = (context?: ChatContext): MarketView | undefined =>
  context?.entity.kind === "market"
    ? { entity: context.entity, period: context.period }
    : undefined;

/** A fixture matches when one keyword hits, and, if it lists groups, when every group has a hit. */
const hasKeyword = (fixture: Fixture, q: string) => {
  const keywords = fixture.keywords ?? [];
  const groups = fixture.allOf ?? [];
  if (keywords.length === 0 && groups.length === 0) return false;
  return (
    (keywords.length === 0 || keywords.some((k) => q.includes(k))) &&
    groups.every((group) => group.some((k) => q.includes(k)))
  );
};

const STATUS_WORDS = /\b(at[- ]risk|off[- ]track|on[- ]track|status)\b/;

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
 * The answer for a question. Order: the error hook; a question about a time after the data ends (it abstains, even
 * when it names a market); a scoped fixture that fits the view; a status question about one named market; an
 * unscoped keyword match; the default. A market template stays out when the question names a different market than
 * the one in view, and when an unscoped fixture keyed on the market in view exists (Germany's curated answer is
 * richer than the template), except for months that answer was not written for. The returned fixture has any
 * template filled in.
 */
export function pickFixture(
  file: FixturesFile,
  ds: Dataset,
  question: string,
  context?: ChatContext,
): Fixture {
  const q = question.toLowerCase();
  const hits = file.fixtures.filter((f) => hasKeyword(f, q));
  const error = hits.find((f) => f.kind === "error");
  if (error) return error;
  const asked = readQuestion(ds, question);
  if (asked.beyondHorizon || asked.beforeData)
    return file.fixtures.find((f) => f.kind === "abstain") ?? file.default;
  const view = marketView(context);
  const scoped = context
    ? hits.find(
        (f) =>
          f.scope !== undefined &&
          scopeFits(f.scope, context) &&
          (f.template === undefined || (view && templateSuits(ds, q, hits, view))),
      )
    : undefined;
  const namedMarket = scoped ? undefined : singleMarketNamed(ds, q);
  // "Why is Spain off track?" asks for a cause. Only a curated answer has one; otherwise the data cannot say.
  const broader =
    /\bmarkets\b|portfolio/.test(q) || ds.regions.some((r) => q.includes(r.name.toLowerCase()));
  // The market in view answers only when the question names no market; two named markets are no single target.
  const named = ds.markets.filter((m) => q.includes(m.name.toLowerCase()));
  const whyTarget =
    named.length === 1
      ? named[0]
      : named.length === 0 && !broader
        ? ds.markets.find((m) => m.id === view?.entity.marketId)
        : undefined;
  const whyStatus = /\bwhy\b/.test(q) && STATUS_WORDS.test(q);
  if (whyStatus && whyTarget && !hits.some((f) => f.marketId === whyTarget.id))
    return fillStatusWhyAbstain(ds, whyTarget);
  // "Why" asks for an explanation, which a market's curated or template answer gives; "Is Germany at risk?" asks for the status.
  if (namedMarket && STATUS_WORDS.test(q) && !/\bwhy\b/.test(q))
    return fillMarketStatus(ds, namedMarket);
  // An answer written about the one market the question names beats a general keyword match ("Why is Germany off track?").
  const aboutNamed = namedMarket && hits.find((f) => f.marketId === namedMarket.id);
  const fixture = scoped ?? aboutNamed ?? hits.find((f) => f.scope === undefined) ?? file.default;
  // A template always comes from a scoped match, which needs a market view; the default is the unreachable fallback.
  if (fixture.template === undefined) {
    return outsideCuratedMonths(file, ds, fixture, asked.span, asked.label, view) ?? fixture;
  }
  return view ? fillMarketMonth(ds, fixture, view.entity, [view.period]) : file.default;
}

/** The market a question names, or undefined when it names none or several. */
function singleMarketNamed(ds: Dataset, q: string): Market | undefined {
  const named = ds.markets.filter((m) => q.includes(m.name.toLowerCase()));
  return named.length === 1 ? named[0] : undefined;
}

/**
 * A curated answer is written for certain months of one market. When the question is about other months of that
 * market (named in the question, or the month in view when the market is), the data-filled template answers instead.
 */
function outsideCuratedMonths(
  file: FixturesFile,
  ds: Dataset,
  fixture: Fixture,
  named: readonly Period[],
  label: string | undefined,
  view: MarketView | undefined,
): Fixture | undefined {
  const { marketId, periods } = fixture;
  const template = file.fixtures.find((f) => f.template !== undefined);
  if (!marketId || !periods || !template) return undefined;
  // The month in view counts only when the user navigated to it: at the latest month "why did it dip?" is the
  // question the curated answer was written for (the Ask why button asks it from there).
  const inView =
    view?.entity.marketId === marketId && view.period !== ds.meta.latestPeriod ? [view.period] : [];
  const [head, ...rest] = named.length > 0 ? named : inView;
  if (head === undefined || [head, ...rest].every((p) => periods.includes(p))) return undefined;
  return fillMarketMonth(ds, template, { kind: "market", marketId }, [head, ...rest], label);
}

/** The status of one market as data.json gives it, for "Is Germany at risk?". Read, not written. */
function fillMarketStatus(ds: Dataset, market: Market): Fixture {
  const { status, forecastAttainmentPct, growthPct, anomalies } = market.kpis;
  const latest = ds.meta.latestPeriod;
  const dip = anomalies.find((a) => a.type === "dip");
  const text =
    `${market.name} is ${STATUS_LABEL[status].toLowerCase()} in the data as of ${formatPeriodAbbr(latest)}: ` +
    `${formatPct(forecastAttainmentPct, { sign: false })} of forecast, ${formatPct(growthPct, { sign: true })} year on year.` +
    (dip ? ` The data also flags a dip in ${formatPeriodAbbr(dip.period)}.` : "");
  const citations: Citation[] = [
    { marketId: market.id, period: latest, label: `${market.name}, latest period` },
  ];
  if (dip) {
    citations.push({
      marketId: market.id,
      period: dip.period,
      label: `${market.name}, ${formatPeriodAbbr(dip.period)} dip`,
    });
  }
  return {
    id: "market-status",
    kind: "normal",
    answer: { text, citations, confidence: "medium" },
  };
}

/** The abstain card for "why is X <status>" when nothing in the data explains it: it says what the data does hold. */
function fillStatusWhyAbstain(ds: Dataset, market: Market): Fixture {
  const { status, forecastAttainmentPct, growthPct } = market.kpis;
  const text =
    `I can't say why ${market.name} is ${STATUS_LABEL[status].toLowerCase()}. The data records its status, ` +
    `${formatPct(forecastAttainmentPct, { sign: false })} attainment and ${formatPct(growthPct, { sign: true })} growth as of ` +
    `${formatPeriodAbbr(ds.meta.latestPeriod)}, but not the drivers behind them. ${STATUS_RULE_TEXT}`;
  return {
    id: "status-why-abstain",
    kind: "abstain",
    answer: { text, citations: [], confidence: "low" },
  };
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
  // A question about a region or the whole portfolio is not about the market in view.
  const namesBroader =
    q.includes("portfolio") || ds.regions.some((r) => q.includes(r.name.toLowerCase()));
  return !namesOther && !curated && !namesBroader;
}

/**
 * Writes the market-month template's text and citations from data.json. This is the only "intelligence" in the
 * mock: numbers are read and formatted, nothing is generated.
 */
function fillMarketMonth(
  ds: Dataset,
  fixture: Fixture,
  entity: MarketView["entity"],
  periods: Periods,
  spanLabel?: string,
): Fixture {
  const first = periods[0];
  const period = periods[periods.length - 1] ?? first;
  const single = periods.length === 1;
  const t = totals(factsFor(ds, { entity, periods: [...periods] }));
  const name = entityName(ds, entity);
  const previous = single ? previousPeriod(ds, period) : undefined;
  const mom = single ? momChangePct(ds, entity, period) : undefined;
  // At the latest month the dashboard shows the market's own KPI, so the answer quotes that, not a recomputation.
  const kpi = ds.markets.find((m) => m.id === entity.marketId)?.kpis.forecastAttainmentPct;
  const attainment =
    single && period === ds.meta.latestPeriod && kpi !== undefined ? kpi : attainmentPct(t);

  const values: Record<string, string> = {
    market: name,
    period: single
      ? formatPeriodAbbr(period)
      : (spanLabel ?? `${formatPeriodAbbr(first)} to ${formatPeriodAbbr(period)}`),
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
  const citations = single
    ? previous === undefined
      ? [cite(period)]
      : [cite(period), cite(previous)]
    : [cite(first), cite(period)];
  return { ...fixture, answer: { ...fixture.answer, text, citations } };
}
