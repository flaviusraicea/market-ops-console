import type { Dataset, Period } from "@/domain";

/** The months and spans a question names, and whether it looks past the data. */
export type Asked = {
  /** Months the question names, as the dataset's periods. Several for a quarter, a year or "2025". */
  span: Period[];
  label: string | undefined;
  beyondHorizon: boolean;
  /** The question names a time before the data starts. */
  beforeData: boolean;
};

const MONTHS: ReadonlyArray<readonly [RegExp, number]> = [
  [/^jan/, 1],
  [/^feb/, 2],
  [/^mar/, 3],
  [/^apr/, 4],
  [/^may/, 5],
  [/^jun/, 6],
  [/^jul/, 7],
  [/^aug/, 8],
  [/^sep/, 9],
  [/^oct/, 10],
  [/^nov/, 11],
  [/^dec/, 12],
];

const MONTH_WORD =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_YEAR = new RegExp(`\\b(${MONTH_WORD})\\.?,?\\s+(?:of\\s+)?(20\\d\\d)\\b`, "g");
const MONTH_ONLY = new RegExp(`\\b(${MONTH_WORD})\\b`, "g");
const QUARTER = /\bq([1-4])\s*(?:of\s+)?(20\d\d)\b|\b(20\d\d)\s*q([1-4])\b/g;
const YEAR = /\b(20\d\d)\b/g;

/** Wording that asks for something that has not happened yet, whatever period it names. */
const FUTURE_WORDS =
  /\b(will|won't|going to|expect(?:ed|s)?|outlook|upcoming|coming (?:months?|weeks?|quarters?)|rest of (?:the )?year|by (?:the )?(?:year[- ]end|end of)|next (?:\d+ )?(?:months?|quarters?|years?)|predict\w*|project(?:ed|ing|ion|ions)?)\b/;
/** "forecast for" is also how a past month is asked about ("the forecast for March"), so a past month cancels it. */
const FORECAST_FOR = /\bforecast for\b/;

const monthNumber = (word: string) => MONTHS.find(([re]) => re.test(word))?.[1] ?? 0;
const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;

/**
 * What period a question names and whether it asks past the end of the data. Reads text only: a month with a year,
 * a quarter, a bare year, a bare month (its latest occurrence), and the future words above.
 */
export function readQuestion(ds: Dataset, question: string): Asked {
  const q = question.toLowerCase();
  const latest = ds.meta.latestPeriod;
  const [ly, lm] = [Number(latest.slice(0, 4)), Number(latest.slice(5))];
  const first = ds.meta.periods[0] ?? latest;
  const inData = (p: string): p is Period => ds.meta.periods.some((x) => x === p);
  let beyond = false;
  let before = false;
  const named: Period[] = [];
  let label: string | undefined;
  let rest = q;

  const seeMonth = (y: number, m: number) => {
    const p = key(y, m);
    if (p > latest) beyond = true;
    else if (p < first) before = true;
    else if (inData(p)) named.push(p);
  };

  for (const m of q.matchAll(QUARTER)) {
    const quarter = Number(m[1] ?? m[4]);
    const year = Number(m[2] ?? m[3]);
    const months = [1, 2, 3].map((i) => (quarter - 1) * 3 + i);
    if (key(year, months[0] ?? 1) > latest) beyond = true;
    else {
      for (const mo of months) seeMonth(year, mo);
      label = `Q${quarter} ${year}`;
    }
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(MONTH_YEAR)) {
    const month = monthNumber(m[1] ?? "");
    seeMonth(Number(m[2]), month);
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(YEAR)) {
    const year = Number(m[1]);
    if (year > ly) beyond = true;
    else if (year < Number(first.slice(0, 4))) before = true;
    else {
      const months = Array.from({ length: 12 }, (_, i) => key(year, i + 1)).filter(inData);
      named.push(...months);
      // A year the data covers only in part reads as its covered range, not as the whole year.
      if (months.length === 12) label ??= String(year);
    }
    rest = rest.replace(m[0], " ");
  }
  // A month without a year means its latest occurrence in the data ("March" is Mar 2026, "September" is Sep 2025).
  // "may" is also a verb, so it counts only with a year.
  if (named.length === 0 && !beyond && !before) {
    for (const m of rest.matchAll(MONTH_ONLY)) {
      const month = monthNumber(m[1] ?? "");
      if (month === 5 && m[1] === "may") continue;
      const year = month <= lm ? ly : ly - 1;
      seeMonth(year, month);
    }
  }

  const span = [...new Set(named)].sort();
  const future = FUTURE_WORDS.test(q) || (FORECAST_FOR.test(q) && span.length === 0);
  return { span, label, beyondHorizon: beyond || future, beforeData: before };
}
