import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import fixturesRaw from "@/data/fixtures.json";
import { attainmentPct, factsFor, growthPct, toPeriod, totals } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { FixturesFileSchema } from "@/domain/stream";
import { INLINE_MAP, inlineKey } from "@/features/assistant/inlineMap";
import { pickFixture } from "@/lib/stream/pickFixture";
import { formatPct } from "@/lib/format";

const ds = parseDataset(raw);
const file = FixturesFileSchema.parse(fixturesRaw);
const ask = (q: string, context?: Parameters<typeof pickFixture>[3]) =>
  pickFixture(file, ds, q, context);
const idOf = (q: string) => ask(q).id;

describe("the horizon guard", () => {
  it.each([
    "What will Germany's revenue be in 2027?",
    "Forecast Germany's revenue for 2027",
    "Will APAC keep outgrowing Europe next year?",
    "Which markets will be at risk next quarter?",
    "What will revenue be in Q3 2026?",
    "Project December 2026 revenue",
    "Why did Germany dip in January 2027?",
    "and next month?",
    "Predict Italy's attainment",
    "What is the forecast for next year?",
    "Is Germany going to recover?",
    "Is Germany expected to recover by year end?",
    "What happens to Germany over the rest of the year?",
    "What's the outlook for APAC vs Europe?",
    "Why did Germany's revenue dip in 2023?",
    "Why did Germany's revenue dip in March 2024?",
  ])("abstains on %s", (q) => {
    expect(ask(q).kind).toBe("abstain");
  });

  it.each([
    "Which markets are at risk this quarter, and why?",
    "Why did Germany's revenue dip in March 2026?",
    "Compare APAC and Europe on growth and forecast attainment",
    "What's driving the portfolio's forecast miss?",
    "What was the forecast for Germany in March 2026?",
    "Why did Germany's revenue dip in September 2025?",
    "What happened to Q4 2025?",
  ])("still answers %s", (q) => {
    expect(ask(q).kind).not.toBe("abstain");
  });
});

describe("Germany's answer follows the period asked", () => {
  it.each([
    ["Why did Germany's revenue dip in March 2026?", "germany-dip"],
    ["What happened to German sales in March?", "germany-dip"],
    ["Why did Germany's revenue fall in Q1 2026?", "germany-dip"],
    ["Why did Germany's revenue dip?", "germany-dip"],
  ])("%s keeps the curated answer", (q, id) => {
    expect(idOf(q)).toBe(id);
  });

  it.each([
    ["Why did Germany's revenue dip in September 2025?", "Sep 2025"],
    ["Why did Germany's revenue dip in Sep 2025?", "Sep 2025"],
    ["Why did Germany's revenue dip in Q4 2025?", "Q4 2025"],
    ["Why did Germany's revenue dip in 2025?", "2025"],
  ])("%s is filled from the data for that period", (q, label) => {
    const f = ask(q);
    expect(f.id).toBe("dip-any-market");
    expect(f.answer.text).toContain(`Germany's revenue in ${label} was`);
    expect(f.answer.citations.every((c) => c.marketId === "de")).toBe(true);
    expect(f.answer.confidence).toBe("medium");
  });

  it("keeps the curated answer when the question names no month and the view is at the latest month", () => {
    // What the Ask why button sends from the Executive view.
    const f = ask("Why did Germany's revenue dip?", {
      entity: { kind: "market", marketId: "de" },
      period: toPeriod("2026-05"),
    });
    expect(f.id).toBe("germany-dip");
  });

  it("labels a year the data covers only in part by its range", () => {
    const f = ask("Why did Germany's revenue dip in 2026?");
    expect(f.answer.text).toContain("Germany's revenue in Jan 2026 to May 2026 was");
    const g = ask("Why did Germany's revenue dip in 2024?");
    expect(g.answer.text).toContain("Jun 2024 to Dec 2024");
  });

  it("uses the month in view when the question names none", () => {
    const f = ask("Why is Germany off track?", {
      entity: { kind: "market", marketId: "de" },
      period: toPeriod("2025-09"),
    });
    expect(f.answer.text).toContain("Germany's revenue in Sep 2025 was");
  });

  it("fills a quarter's figures from the series, not from a month", () => {
    const f = ask("Why did Germany's revenue dip in Q4 2025?");
    const t = totals(
      factsFor(ds, {
        entity: { kind: "market", marketId: "de" },
        periods: [toPeriod("2025-10"), toPeriod("2025-11"), toPeriod("2025-12")],
      }),
    );
    expect(f.answer.text).toContain(formatPct(attainmentPct(t), { sign: false }));
  });
});

describe("rephrasings reach the right answer", () => {
  it.each([
    ["What markets should I worry about?", "at-risk"],
    ["Which countries are off track?", "at-risk"],
    ["Where are we falling behind plan?", "at-risk"],
    ["How does Europe stack up against APAC?", "apac-vs-europe"],
    ["Europe vs Asia Pacific growth", "apac-vs-europe"],
    ["Why are we below forecast overall?", "forecast-miss"],
    ["Why is the portfolio missing plan?", "forecast-miss"],
    ["What's behind the shortfall vs forecast?", "forecast-miss"],
  ])("%s", (q, id) => {
    expect(idOf(q)).toBe(id);
  });

  it.each([
    "Which markets grew fastest?",
    "Compare LATAM and APAC",
    "Compare Europe and North America",
  ])("sends %s to the honest fallback, not a wrong answer", (q) => {
    expect(ask(q)).toBe(file.default);
  });

  it("answers 'Is Germany at risk?' from the market's own status", () => {
    const f = ask("Is Germany at risk?");
    expect(f.answer.text).toContain("Germany is off track");
    expect(f.answer.text).toContain("92.0% of forecast");
  });
});

describe("scripted answers agree with data.json", () => {
  const pct = (n: number) => formatPct(n, { sign: false });
  const flagged = ds.markets.filter((m) => m.kpis.status !== "on_track");
  const word = (n: number) =>
    ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][n] ?? `${n}`;

  it("the at-risk answer names the flagged markets and no others, and counts them", () => {
    const text = ask("Which markets are at risk?").answer.text;
    expect(text).toContain(
      `As of May 2026, ${word(flagged.length).toLowerCase()} markets are flagged`,
    );
    expect(text).toContain(`The other ${word(ds.markets.length - flagged.length).toLowerCase()}`);
    for (const m of ds.markets) {
      const named = text.includes(m.name);
      expect(named, m.name).toBe(m.kpis.status !== "on_track");
    }
  });

  it("each market's status word is data.json's, apart from Germany's deliberate mismatch", () => {
    const text = ask("Which markets are at risk?").answer.text;
    const spain = ds.markets.find((m) => m.id === "es")!;
    expect(spain.kpis.status).toBe("off_track");
    expect(text).toContain("Spain is off track");
    for (const id of ["it", "gb", "fr", "br"]) {
      expect(ds.markets.find((m) => m.id === id)!.kpis.status).toBe("at_risk");
    }
    expect(text).toContain("Italy, the United Kingdom, France and Brazil are at risk");
  });

  it("the forecast-miss answer corrects the premise with the portfolio's own attainment", () => {
    const latest = ds.meta.latestPeriod;
    const t = totals(factsFor(ds, { entity: { kind: "portfolio" }, periods: [latest] }));
    const text = ask("What's driving the portfolio's forecast miss?").answer.text;
    expect(text).toContain(`not missing forecast: it is at ${pct(attainmentPct(t))} of forecast`);
    for (const id of ["de", "it", "gb"]) {
      const m = ds.markets.find((x) => x.id === id)!;
      expect(text).toContain(`${pct(m.kpis.forecastAttainmentPct)}`);
    }
    const apac = totals(
      factsFor(ds, { entity: { kind: "region", regionId: "apac" }, periods: [latest] }),
    );
    expect(text).toContain(`APAC runs ahead at ${pct(attainmentPct(apac))}`);
  });

  it("the APAC and Europe answer quotes both regions' growth and attainment", () => {
    const latest = ds.meta.latestPeriod;
    const region = (regionId: "apac" | "eu") =>
      totals(factsFor(ds, { entity: { kind: "region", regionId }, periods: [latest] }));
    const text = ask("Compare APAC and Europe on growth and forecast attainment").answer.text;
    const [apac, eu] = [region("apac"), region("eu")];
    expect(text).toContain(
      `up ${formatPct(growthPct(apac), { sign: false })} year on year and sits at ${pct(attainmentPct(apac))} of forecast`,
    );
    expect(text).toContain(
      `${formatPct(growthPct(eu), { sign: false })} growth and ${pct(attainmentPct(eu))} for Europe`,
    );
  });
});

describe("inline citation phrases", () => {
  it("every mapped phrase occurs in its fixture's text, so a copy edit cannot silently drop a link", () => {
    for (const f of file.fixtures) {
      const phrases = INLINE_MAP[inlineKey(f.answer.citations)];
      for (const { phrase } of phrases ?? []) {
        expect(f.answer.text, `${f.id}: ${phrase}`).toContain(phrase);
      }
    }
  });
});
