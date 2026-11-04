import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import fixturesRaw from "@/data/fixtures.json";
import { attainmentPct, factsFor, toPeriod, totals } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { FixturesFileSchema } from "@/domain/stream";
import { crossChecks, isJustBelow } from "@/features/assistant/crossChecks";
import { INLINE_MAP, inlineKey } from "@/features/assistant/inlineMap";
import starter from "../fixtures/starter-fixtures.json";
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

describe("the starter pack's answers are shown as given and checked against data.json", () => {
  const pack = FixturesFileSchema.parse(starter);
  it("keeps the text and citations of every answer the pack shipped", () => {
    for (const given of [pack.default, ...pack.fixtures]) {
      const ours =
        given.id === "default" ? file.default : file.fixtures.find((f) => f.id === given.id);
      expect(ours?.answer, given.id).toEqual(given.answer);
    }
  });

  const keyOf = (id: string) => inlineKey(pack.fixtures.find((f) => f.id === id)!.answer.citations);
  const latest = ds.meta.latestPeriod;
  const pct = (n: number) => formatPct(n, { sign: false });
  const region = (regionId: "apac" | "eu") =>
    attainmentPct(
      totals(factsFor(ds, { entity: { kind: "region", regionId }, periods: [latest] })),
    );

  it("flags the at-risk answer's count against the markets data.json flags", () => {
    const [line] = crossChecks(ds, keyOf("at-risk"));
    expect(line).toContain("the answer names three markets; data.json flags six");
    for (const m of ds.markets.filter((x) => x.kpis.status !== "on_track")) {
      expect(line).toContain(m.name);
    }
    expect(line).toContain("Germany and Spain are off track");
  });

  it("flags the forecast-miss premise with the portfolio's own attainment", () => {
    const portfolio = attainmentPct(
      totals(factsFor(ds, { entity: { kind: "portfolio" }, periods: [latest] })),
    );
    expect(crossChecks(ds, keyOf("forecast-miss"))).toEqual([
      `Differs from source: the portfolio is at ${pct(portfolio)} of forecast in May 2026; the answer describes a forecast miss.`,
    ]);
  });

  it("flags Europe's attainment next to the 'just below' claim", () => {
    expect(crossChecks(ds, keyOf("apac-vs-europe"))).toEqual([
      `Differs from source: Europe is at ${pct(region("eu"))} of forecast in May 2026 and APAC at ${pct(region("apac"))}; the answer says Europe is "just below" 100%.`,
    ]);
  });

  it("treats only 99.0 to just under 100 as 'just below'", () => {
    expect([98.9, 99, 99.5, 99.9, 100, 104.9, 95.4].map(isJustBelow)).toEqual([
      false,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it("says a past-period at-risk question got the latest month's status", () => {
    const [note, flag] = crossChecks(ds, keyOf("at-risk"), "Which markets were at risk in 2025?");
    expect(note).toBe(
      "Status is only given for May 2026: this answer describes that month, not the period asked about.",
    );
    expect(flag).toContain("data.json flags six");
    expect(
      crossChecks(ds, keyOf("at-risk"), "Which markets are at risk in May 2026?"),
    ).toHaveLength(1);
    expect(crossChecks(ds, keyOf("at-risk"), "Which markets are at risk?")).toHaveLength(1);
  });

  it("flags the summary's 'close to plan' markets and its short watch list", () => {
    const [line] = crossChecks(ds, keyOf("summary-long"));
    expect(line).toContain("United Kingdom is at risk");
    expect(line).toContain("France is at risk");
    expect(line).toContain("Spain is off track");
    expect(line).toContain("It names three markets to watch; data.json flags six");
  });

  it("says nothing about an answer it has no check for", () => {
    expect(crossChecks(ds, keyOf("germany-dip"))).toEqual([]);
    expect(crossChecks(ds, "")).toEqual([]);
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

describe("a place the data does not have", () => {
  it("abstains and names it", () => {
    const f = ask("Why did Narnia dip?", {
      entity: { kind: "market", marketId: "ca" },
      period: ds.meta.latestPeriod,
    });
    expect(f.kind).toBe("abstain");
    expect(f.answer.text.startsWith("I don't know a market called Narnia")).toBe(true);
  });
});

describe("a follow-up in a market view", () => {
  it("answers about that market and the month it names", () => {
    const f = ask("and in April?", {
      entity: { kind: "market", marketId: "de" },
      period: ds.meta.latestPeriod,
    });
    expect(f.answer.text).toContain("Germany");
    expect(f.answer.text).toContain("Apr 2026");
  });
});

describe("a question with no keywords answers about the scope its label names", () => {
  const canada = {
    entity: { kind: "market", marketId: "ca" },
    period: ds.meta.latestPeriod,
  } as const;
  const germany = {
    entity: { kind: "market", marketId: "de" },
    period: ds.meta.latestPeriod,
  } as const;
  it("a market it names beats the market in view", () => {
    expect(ask("How is France doing?", canada).answer.text).toMatch(/^France's revenue/);
  });
  it("a market it names from the portfolio gets that market", () => {
    const f = ask("Tell me about Japan", {
      entity: { kind: "portfolio" },
      period: ds.meta.latestPeriod,
    });
    expect(f.answer.text).toMatch(/^Japan's revenue/);
  });
  it("the portfolio it names keeps the portfolio answer in a market view", () => {
    expect(ask("Summarise the portfolio", germany).answer.text).not.toMatch(/^Germany's revenue/);
  });
});

describe("a capitalised word that is not a place", () => {
  it("keeps the answer its keywords pick", () => {
    expect(ask("Give me the Executive summary", undefined).id).toBe("summary-long");
  });
});
