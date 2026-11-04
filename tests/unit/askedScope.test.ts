import { describe, expect, it } from "vitest";

import type { Entity } from "@/domain";
import { PeriodSchema } from "@/domain/dataset";
import { askedLabel, isFollowUp, unknownPlace } from "@/lib/stream/askedScope";
import { ds } from "./helpers";

const may = PeriodSchema.parse("2026-05");
type Page = { entity: Entity; period: typeof may } | undefined;

const portfolio: Page = { entity: { kind: "portfolio" }, period: may };
const europe: Page = { entity: { kind: "region", regionId: "eu" }, period: may };
const canada: Page = { entity: { kind: "market", marketId: "ca" }, period: may };
const apac: Page = { entity: { kind: "region", regionId: "apac" }, period: may };
const germany: Page = { entity: { kind: "market", marketId: "de" }, period: may };
const germanyCalyx: Page = {
  entity: { kind: "product", marketId: "de", productId: "calyx" },
  period: may,
};

describe("the Asked about label is the scope the question resolves to", () => {
  // [page, question, label]
  const cases: Array<[string, Page, string, string]> = [
    // The reported bug: a named market beats the page.
    ["market named, on another market", canada, "Why did Germany dip?", "Germany · May 2026"],
    ["market named, on the portfolio", portfolio, "Why did Germany dip?", "Germany · May 2026"],
    ["market named, on a region", europe, "Why did Canada dip?", "Canada · May 2026"],
    ["market named, in view", germany, "Why did Germany dip?", "Germany · May 2026"],
    [
      "market named, product view of it stays",
      germanyCalyx,
      "Why did Germany dip?",
      "Germany · Calyx · May 2026",
    ],
    // Nothing named: the page.
    ["nothing named, market page", canada, "Why did revenue dip?", "Canada · May 2026"],
    ["nothing named, portfolio", portfolio, "Which markets are at risk?", "Portfolio · May 2026"],
    ["nothing named, region page", europe, "Which markets are at risk?", "Europe · May 2026"],
    // A region named.
    ["region named, on the portfolio", portfolio, "How is APAC doing?", "APAC · May 2026"],
    ["region named, on a market", canada, "How is APAC doing?", "APAC · May 2026"],
    [
      "region named, on another region",
      europe,
      "How is North America doing?",
      "North America · May 2026",
    ],
    // A period named.
    ["month named", canada, "Why did revenue dip in March?", "Canada · Mar 2026"],
    ["month and year named", canada, "Why did revenue dip in Mar 2025?", "Canada · Mar 2025"],
    ["quarter named", portfolio, "How was Q1 2026?", "Portfolio · Q1 2026"],
    ["portfolio named, on a market", germany, "Summarise the portfolio", "Portfolio · May 2026"],
    // Both named.
    ["market and month named", canada, "Why did Germany dip in March?", "Germany · Mar 2026"],
    ["region and month named", canada, "How did Europe do in Mar 2026?", "Europe · Mar 2026"],
    [
      "market inside a named region",
      portfolio,
      "Why is Germany behind in Europe?",
      "Germany · May 2026",
    ],
    // Nothing the data covers: no month is claimed.
    ["month after the data ends", germany, "Why will Germany dip in Dec 2026?", "Germany"],
    // No page (a question asked with no view).
    ["no page, market named", undefined, "Why did Germany dip in March?", "Germany · Mar 2026"],
    ["no page, nothing named", undefined, "Why did revenue dip?", ""],
  ];

  it.each(cases)("%s", (_name, page, question, label) => {
    expect(askedLabel(ds, question, page) ?? "").toBe(label);
  });

  const ruled: Array<[string, Page, string, string]> = [
    ["two markets named", canada, "Compare Germany and France", "Germany and France · May 2026"],
    [
      "three markets named",
      canada,
      "Compare Germany, France and Italy",
      "Germany, France and Italy · May 2026",
    ],
    ["market outside the page's region", apac, "Why did Germany dip?", "Germany · May 2026"],
    ["unknown market keeps the page", canada, "Why did Narnia dip?", "Canada · May 2026"],
    [
      "unknown market keeps the period named",
      canada,
      "Why did Narnia dip in March?",
      "Canada · Mar 2026",
    ],
  ];
  it.each(ruled)("%s", (_name, page, question, label) => {
    expect(askedLabel(ds, question, page) ?? "").toBe(label);
  });

  it("narrows to the markets an answer covers", () => {
    expect(askedLabel(ds, "Compare Germany and France", canada, ["de"])).toBe("Germany · May 2026");
  });

  it("a follow-up names nothing, so it is told apart from a fresh question", () => {
    expect(isFollowUp(ds, "and in April?")).toBe(true);
    expect(isFollowUp(ds, "What about France?")).toBe(false);
    expect(isFollowUp(ds, "Why did revenue dip?")).toBe(false);
  });

  it("a follow-up keeps the place and takes the month it names", () => {
    expect(askedLabel(ds, "and in April?", germany)).toBe("Germany · Apr 2026");
  });

  it.each(["Why did Narnia dip?", "Is Atlantis at risk?"])(
    "%s: names no place the data has",
    (q) => {
      expect(unknownPlace(ds, q)).toBe(q.includes("Narnia") ? "Narnia" : "Atlantis");
    },
  );

  it.each([
    "Why did Germany dip?",
    "Why did revenue dip in March?",
    "How is APAC doing?",
    "What about Veltrix?",
    "Which markets are at risk?",
  ])("%s: is not an unknown place", (q) => {
    expect(unknownPlace(ds, q)).toBeUndefined();
  });
});
