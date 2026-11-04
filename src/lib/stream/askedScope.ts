import { entityName, type Dataset, type Entity, type Market, type Period } from "@/domain";
import { formatPeriodAbbr } from "@/lib/format";
import { readQuestion } from "./horizon";

type Page = { entity: Entity; period: Period } | undefined;

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mentions = (q: string, name: string) =>
  new RegExp(`\\b${escape(name.toLowerCase())}\\b`).test(q);

/** The markets a question names, in the order the dataset lists them. */
export function marketsNamed(ds: Dataset, question: string): Market[] {
  const q = question.toLowerCase();
  return ds.markets.filter((m) => mentions(q, m.name));
}

/** The market a question names, or undefined when it names none or several. */
export function singleMarketNamed(ds: Dataset, question: string): Market | undefined {
  const named = marketsNamed(ds, question);
  return named.length === 1 ? named[0] : undefined;
}

const regionNamed = (ds: Dataset, question: string) =>
  ds.regions.find((r) => mentions(question.toLowerCase(), r.name));

const MONTH_NAMES =
  /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i;

const DEMONYM = /^(british|american|asian|european)$/i;

/**
 * A place the question names that the data does not have ("Why did Narnia dip?"): a capitalised word after the
 * first that is not a market, region, product or month. Undefined when the question names a known place.
 */
export function unknownPlace(ds: Dataset, question: string): string | undefined {
  if (marketsNamed(ds, question).length > 0 || regionNamed(ds, question)) return undefined;
  const known = [...ds.products, ...ds.markets, ...ds.regions].map((x) => x.name.toLowerCase());
  // "German sales", "Japanese yen": a demonym shares its first four letters with the place it comes from.
  const fromKnown = (w: string) => known.some((k) => k.slice(0, 4) === w.slice(0, 4).toLowerCase());
  for (const m of question.matchAll(/\b[A-Z][a-z]{3,}\b/g)) {
    const word = m[0];
    const before = question.slice(0, m.index).trim();
    if (before === "" || /[.?!]$/.test(before)) continue;
    if (MONTH_NAMES.test(word) || DEMONYM.test(word) || fromKnown(word)) continue;
    return word;
  }
  return undefined;
}

/** A follow-up leans on the previous answer for what it is about ("and in April?"). */
export const FOLLOW_UP = /^\s*(and|also|what about|how about)\b/i;

export const isFollowUp = (ds: Dataset, question: string): boolean =>
  FOLLOW_UP.test(question) && marketsNamed(ds, question).length === 0 && !regionNamed(ds, question);

/** What a question is about: the place and months it names, else the view it was asked from. */
export type AskedScope = { entity: Entity | undefined; markets: Market[]; periods: Period[] };

/**
 * The scope an answer is about. The question wins: markets it names (the one in view, or a product of it, stays as
 * the view), else a region it names, and the months it names; whatever it leaves out comes from the page it was
 * asked on. The answer's picker reads its market from the same functions, so label and answer cannot disagree.
 */
export function askedScope(ds: Dataset, question: string, page: Page): AskedScope {
  const markets = marketsNamed(ds, question);
  const region = regionNamed(ds, question);
  const read = readQuestion(ds, question);
  const view = page?.entity;
  let entity: Entity | undefined = view;
  const [market] = markets;
  if (markets.length === 1 && market) {
    const inView =
      (view?.kind === "market" || view?.kind === "product") && view.marketId === market.id;
    entity = inView ? view : { kind: "market", marketId: market.id };
  } else if (markets.length === 0 && region) {
    entity = { kind: "region", regionId: region.id };
  }
  // A time the data does not cover is not claimed: the answer abstains, so no month is named.
  if (read.beyondHorizon || read.beforeData) return { entity, markets, periods: [] };
  return { entity, markets, periods: read.span.length > 0 ? read.span : page ? [page.period] : [] };
}

/** "Germany · Mar 2026", "Germany and France · May 2026", "Europe · Q1 2026": the label the question echo shows. */
export function askedLabel(
  ds: Dataset,
  question: string,
  page: Page,
  /** Market ids the answer covers, when that is fewer than the question names. */
  only?: readonly string[],
): string | undefined {
  const scope = askedScope(ds, question, page);
  const markets = only ? scope.markets.filter((m) => only.includes(m.id)) : scope.markets;
  const { periods } = scope;
  const entity =
    only && markets.length === 1 && markets[0]
      ? ({ kind: "market", marketId: markets[0].id } as const)
      : scope.entity;
  if (!entity) return undefined;
  const read = readQuestion(ds, question);
  const first = periods[0];
  const last = periods[periods.length - 1];
  const when =
    first === undefined || last === undefined
      ? undefined
      : first === last
        ? formatPeriodAbbr(first)
        : (read.label ?? `${formatPeriodAbbr(first)} to ${formatPeriodAbbr(last)}`);
  const name = markets.length > 1 ? list(markets.map((m) => m.name)) : entityName(ds, entity);
  return when ? `${name} · ${when}` : name;
}

/** "Germany", "Germany and France", "Germany, France and Italy". */
export function list(names: readonly string[]): string {
  return names.length < 2
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
