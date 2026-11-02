import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { CitationSchema, parseDataset, resolveCitation } from "@/domain";
import { sourcesRows, type SourcesMeta } from "@/features/assistant/sourcesRows";
import type { Resolved } from "@/features/assistant/useAnswerMachine";

const ds = parseDataset(raw);

// The claim text handed to the resolver is the mapped claim of that citation, so "March dip" is not
// judged against the status words elsewhere in the answer.
function resolved(id: string, meta: SourcesMeta): { citations: Resolved[] } {
  const fx = fixtures.fixtures.find((f) => f.id === id)!;
  const citations = fx.answer.citations.map((c, i) => {
    const citation = CitationSchema.parse(c);
    return { citation, resolution: resolveCitation(ds, citation, meta.items[i]?.claim) };
  });
  return { citations };
}

// Mirrors what inlineMap.ts supplies per fixture (preview-spec.md 9.4 and the sources addendum).
const AT_RISK: SourcesMeta = {
  caption:
    "The dashboard follows data.json. 4 markets are at risk and 2 are off track there; the assistant names 3.",
  items: [
    { claim: "Germany at risk", assistantWord: "At risk" },
    { claim: "March dip", assistantWord: "Sharp dip" },
    { claim: "Italy at risk", assistantWord: "At risk" },
    { claim: "Brazil at risk", assistantWord: "At risk" },
  ],
};
const GERMANY_DIP: SourcesMeta = {
  caption: "Source · data.json · Germany is Off track at 92.0% attainment for May 2026.",
  items: [
    { claim: "Fell in early 2026", assistantWord: "Revenue fell" },
    { claim: "Steepest drop in March", assistantWord: "Steepest drop" },
    { claim: "Decline across the portfolio", assistantWord: "Across products" },
  ],
};
const FORECAST_MISS: SourcesMeta = {
  caption:
    "Source · data.json · The data does not break out forecast drivers, which is why confidence is Low.",
  withRevenue: true,
  items: [
    { claim: "Largest contributor", assistantWord: "Under plan" },
    { claim: "Largest contributor", assistantWord: "Under plan" },
    { claim: "Smaller drag", assistantWord: "Smaller drag" },
  ],
};

describe("sourcesRows", () => {
  it("at-risk answer: four rows, Germany row disagrees with the source", () => {
    const { rows, caption } = sourcesRows(ds, resolved("at-risk", AT_RISK).citations, AT_RISK);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      claim: "Germany at risk",
      entity: "Germany",
      period: "2026-05",
      sourceValue: "Off track · 92.0% attainment",
      assistant: "At risk",
      disagreement: true,
    });
    expect(rows[1]!.sourceValue).toContain("−27% vs Feb");
    expect(rows[1]!.assistant).toBe("Sharp dip");
    expect(rows[2]).toMatchObject({
      entity: "Italy",
      sourceValue: "At risk · 93.0% attainment",
      disagreement: false,
    });
    expect(rows[3]!.sourceValue).toBe("At risk · 96.0% attainment");
    expect(caption).toContain("4 markets are at risk and 2 are off track");
  });

  it("Germany dip answer: three rows matching the addendum", () => {
    const { rows, caption } = sourcesRows(
      ds,
      resolved("germany-dip", GERMANY_DIP).citations,
      GERMANY_DIP,
    );
    expect(rows.map((r) => [r.claim, r.entity, r.period, r.sourceValue, r.assistant])).toEqual([
      [
        "Fell in early 2026",
        "Germany",
        "2026-02",
        "$1.66M actual · 91.1% of forecast",
        "Revenue fell",
      ],
      [
        "Steepest drop in March",
        "Germany",
        "2026-03",
        "$1.21M actual · −27% vs Feb (anomaly note)",
        "Steepest drop",
      ],
      [
        "Decline across the portfolio",
        "Germany · Veltrix",
        "2026-03",
        "$0.43M actual · 92.5% of forecast · was $0.57M in Feb",
        "Across products",
      ],
    ]);
    expect(rows.some((r) => r.disagreement)).toBe(false);
    expect(caption).toBe(GERMANY_DIP.caption);
  });

  it("forecast-miss answer: three rows with revenue", () => {
    const { rows } = sourcesRows(
      ds,
      resolved("forecast-miss", FORECAST_MISS).citations,
      FORECAST_MISS,
    );
    expect(rows.map((r) => [r.entity, r.sourceValue, r.assistant])).toEqual([
      ["Germany", "Off track · 92.0% attainment · $1.68M", "Under plan"],
      ["Italy", "At risk · 93.0% attainment · $0.94M", "Under plan"],
      ["Brazil", "At risk · 96.0% attainment · $1.12M", "Smaller drag"],
    ]);
  });

  it("falls back to the label when a claim is not mapped, and marks unresolved citations", () => {
    const bad = {
      citation: { marketId: "xx", label: "Atlantis" },
      resolution: resolveCitation(ds, { marketId: "xx", label: "Atlantis" }),
    };
    const { rows } = sourcesRows(
      ds,
      [...resolved("forecast-miss", FORECAST_MISS).citations.slice(0, 1), bad],
      {
        caption: "c",
        items: [],
      },
    );
    expect(rows[0]!.claim).toBe("Germany");
    expect(rows[1]).toMatchObject({
      claim: "Atlantis",
      entity: "Could not resolve",
      period: "—",
      sourceValue: "—",
      assistant: "—",
      resolved: false,
    });
  });
});
