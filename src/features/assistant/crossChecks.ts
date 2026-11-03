import {
  STATUS_LABEL,
  attainmentPct,
  factsFor,
  totals,
  type Dataset,
  type Entity,
  type Market,
} from "@/domain";
import { readQuestion } from "@/lib/stream/horizon";
import { ANSWER_KEYS } from "./inlineMap";
import { formatPct, formatPeriod } from "@/lib/format";

/**
 * The starter pack's canned answers are shown as given. Where one says something data.json contradicts, the card
 * flags it in the same words as the status check ("Differs from source"), computed from the dataset, never typed in.
 * Keyed like INLINE_MAP, by the answer's citation labels.
 */
const KEYS = ANSWER_KEYS;

const COUNT = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** "A", "A and B", "A, B and C". */
const list = (names: readonly string[]) =>
  names.length < 2
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

const nameOf = (m: Market) => m.name;
const flagged = (ds: Dataset) => ds.markets.filter((m) => m.kpis.status !== "on_track");
const withStatus = (ds: Dataset, status: Market["kpis"]["status"]) =>
  ds.markets.filter((m) => m.kpis.status === status);

function flagSentence(ds: Dataset): string {
  const off = withStatus(ds, "off_track").map(nameOf);
  const risk = withStatus(ds, "at_risk").map(nameOf);
  const count = COUNT[flagged(ds).length] ?? String(flagged(ds).length);
  return `data.json flags ${count}: ${list(off)} ${off.length === 1 ? "is" : "are"} off track; ${list(risk)} ${risk.length === 1 ? "is" : "are"} at risk`;
}

function attainment(ds: Dataset, entity: Entity): number | undefined {
  const t = totals(factsFor(ds, { entity, periods: [ds.meta.latestPeriod] }));
  return t.forecast === 0 ? undefined : attainmentPct(t);
}

/** "Just below 100%" is within a point under it; any other figure contradicts the claim. */
export const isJustBelow = (attainment: number) => attainment >= 99 && attainment < 100;

const pct = (n: number) => formatPct(n, { sign: false });

/** The lines to show under an answer, each starting "Differs from source:". Empty for any other answer. */
export function crossChecks(ds: Dataset, key: string, question = ""): string[] {
  const month = ds.meta.latestPeriod;
  const monthName = formatPeriod(month);
  switch (key) {
    case KEYS.atRisk: {
      const lines = [`Differs from source: the answer names three markets; ${flagSentence(ds)}.`];
      // data.json gives a status only for the latest month, so a question about another period gets this answer as is.
      const other = readQuestion(ds, question).span.some((p) => p !== month);
      if (other) {
        lines.unshift(
          `Status is only given for ${monthName}: this answer describes that month, not the period asked about.`,
        );
      }
      return lines;
    }
    case KEYS.forecastMiss: {
      const portfolio = attainment(ds, { kind: "portfolio" });
      return portfolio !== undefined && portfolio >= 100
        ? [
            `Differs from source: the portfolio is at ${pct(portfolio)} of forecast in ${monthName}; the answer describes a forecast miss.`,
          ]
        : [];
    }
    case KEYS.apacVsEurope: {
      const eu = attainment(ds, { kind: "region", regionId: "eu" });
      const apac = attainment(ds, { kind: "region", regionId: "apac" });
      return eu !== undefined && apac !== undefined && !isJustBelow(eu)
        ? [
            `Differs from source: Europe is at ${pct(eu)} of forecast in ${monthName} and APAC at ${pct(apac)}; the answer says Europe is "just below" 100%.`,
          ]
        : [];
    }
    case KEYS.summary: {
      const by = (id: string) => ds.markets.find((m) => m.id === id);
      const close = ["gb", "fr", "es"].flatMap((id) => {
        const m = by(id);
        return m && m.kpis.status !== "on_track"
          ? [`${m.name} is ${STATUS_LABEL[m.kpis.status].toLowerCase()}`]
          : [];
      });
      return [
        `Differs from source: the answer says the United Kingdom, France and Spain are close to plan; in data.json ${list(close)}. It names three markets to watch; ${flagSentence(ds)}.`,
      ];
    }
    default:
      return [];
  }
}
