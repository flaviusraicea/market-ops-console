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
} from "@/domain";
import { formatMoneyCompact, formatPct, formatPeriodAbbr } from "@/lib/format";

/** A fixture's answer once any template is filled. */
export type ResolvedFixture = Omit<Fixture, "template">;

const hasKeyword = (fixture: Fixture, q: string) =>
  (fixture.keywords ?? []).some((k) => q.includes(k));

/** Whether the view the question was asked from is the one a fixture's scope is written for. */
function scopeFits(scope: NonNullable<Fixture["scope"]>, entity: Entity): boolean {
  if (scope.entity !== entity.kind) return false;
  if (entity.kind === "region")
    return scope.regionId === undefined || scope.regionId === entity.regionId;
  if (entity.kind === "market")
    return scope.marketId === undefined || scope.marketId === entity.marketId;
  return true;
}

/**
 * The fixture for a question: a scoped fixture that fits the view first, then the first unscoped keyword match,
 * then the default. A question that names a market ("Why did Germany dip?") keeps its own fixture: market-scoped
 * answers are for questions that mean "this market".
 */
export function pickFixture(
  file: FixturesFile,
  ds: Dataset,
  question: string,
  context?: ChatContext,
): Fixture {
  const q = question.toLowerCase();
  const namesMarket = ds.markets.some((m) => q.includes(m.name.toLowerCase()));
  const hits = file.fixtures.filter((f) => hasKeyword(f, q));
  const scoped = context
    ? hits.find(
        (f) =>
          f.scope !== undefined &&
          scopeFits(f.scope, context.entity) &&
          !(f.scope.entity === "market" && namesMarket),
      )
    : undefined;
  return scoped ?? hits.find((f) => f.scope === undefined) ?? file.default;
}

/**
 * Writes a template fixture's text and citations from data.json. This is the only "intelligence" in the mock:
 * numbers are read and formatted, nothing is generated.
 */
export function resolveFixture(
  ds: Dataset,
  fixture: Fixture,
  context?: ChatContext,
): ResolvedFixture {
  const { template, ...rest } = fixture;
  if (template === undefined) return rest;
  if (context?.entity.kind !== "market") {
    throw new RangeError(`Fixture ${fixture.id} needs a market view`);
  }
  const { entity, period } = context;
  const t = totals(factsFor(ds, { entity, periods: [period] }));
  const name = entityName(ds, entity);
  const previous = previousPeriod(ds, period);
  const mom = momChangePct(ds, entity, period);

  const values: Record<string, string> = {
    market: name,
    period: formatPeriodAbbr(period),
    actual: formatMoneyCompact(t.actual),
    forecast: formatMoneyCompact(t.forecast),
    attainment: formatPct(attainmentPct(t), { sign: false }),
    mom: mom === undefined ? "" : `; ${formatPct(mom, { sign: true })} on the previous month`,
  };
  // A function replacer keeps "$" in the values (money) from being read as a replacement pattern.
  const text = fixture.answer.text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

  const cite = (p: typeof period): Citation => ({
    marketId: entity.marketId,
    period: p,
    label: `${name}, ${formatPeriodAbbr(p)}`,
  });
  const citations = previous === undefined ? [cite(period)] : [cite(period), cite(previous)];
  return { ...rest, answer: { ...fixture.answer, text, citations } };
}
