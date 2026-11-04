import { lightDataset } from "@/lib/context/invariants";
import { loadFullDataset } from "@/lib/fullDataset";
import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { resolveCitation } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { CitationSchema } from "@/domain/stream";
import { SOURCES_META, claimTextFor, inlineKey } from "@/features/assistant/inlineMap";
import { sourcesRows, type SourcesMeta } from "@/features/assistant/sourcesRows";
import type { Resolved } from "@/features/assistant/useAnswerMachine";

const ds = parseDataset(raw);

// The claim text handed to the resolver is the mapped claim of that citation, so "March dip" is not
// judged against the status words elsewhere in the answer.
function resolved(id: string): { citations: Resolved[] } {
  const fx = fixtures.fixtures.find((f) => f.id === id)!;
  const citations = fx.answer.citations.map((c, i) => {
    const citation = CitationSchema.parse(c);
    return {
      citation,
      resolution: resolveCitation(
        ds,
        citation,
        claimTextFor(fx.answer.text, fx.answer.citations, i),
      ),
    };
  });
  return { citations };
}

const metaFor = (id: string): SourcesMeta => {
  const fx = fixtures.fixtures.find((f) => f.id === id)!;
  return SOURCES_META[inlineKey(fx.answer.citations)]!;
};
const AT_RISK = metaFor("at-risk");
const GERMANY_DIP = metaFor("germany-dip");
const FORECAST_MISS = metaFor("forecast-miss");

describe("sourcesRows", () => {
  it("at-risk answer: four rows, Germany row disagrees with the source", () => {
    const { rows, caption } = sourcesRows(ds, resolved("at-risk").citations, AT_RISK);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      claim: "Germany at risk",
      entity: "Germany",
      period: "May 2026",
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
    expect(caption).toBe("Sources · data.json · attainment as given · derived");
  });

  it("Germany dip answer: three rows following the formatting rule", () => {
    const { rows, caption } = sourcesRows(ds, resolved("germany-dip").citations, GERMANY_DIP);
    expect(rows.map((r) => [r.claim, r.entity, r.period, r.sourceValue, r.assistant])).toEqual([
      [
        "Fell in early 2026",
        "Germany",
        "Feb 2026",
        "$1.66M actual · 91.1% of forecast",
        "Revenue fell",
      ],
      [
        "Steepest drop in March",
        "Germany",
        "Mar 2026",
        "$1.21M actual · 92.2% of forecast · −27% vs Feb (anomaly note)",
        "Steepest drop",
      ],
      [
        "Decline across the portfolio",
        "Germany · Veltrix",
        "Mar 2026",
        "$427K actual · 92.5% of forecast",
        "Across products",
      ],
    ]);
    expect(rows.some((r) => r.disagreement)).toBe(false);
    expect(caption).toBe("Sources · data.json · attainment as given · derived");
  });

  it("forecast-miss answer: three rows with revenue", () => {
    const { rows, caption } = sourcesRows(ds, resolved("forecast-miss").citations, FORECAST_MISS);
    expect(caption).toBe("Sources · data.json · attainment as given");
    expect(rows.map((r) => [r.entity, r.sourceValue, r.assistant])).toEqual([
      ["Germany", "Off track · 92.0% attainment · $1.68M", "Under plan"],
      ["Italy", "At risk · 93.0% attainment · $941K", "Under plan"],
      ["Brazil", "At risk · 96.0% attainment · $1.12M", "Smaller drag"],
    ]);
  });

  it("falls back to the label when a claim is not mapped, and marks unresolved citations", () => {
    const bad = {
      citation: { marketId: "xx", label: "Atlantis" },
      resolution: resolveCitation(ds, { marketId: "xx", label: "Atlantis" }),
    };
    const { rows } = sourcesRows(ds, [...resolved("forecast-miss").citations.slice(0, 1), bad], {
      items: [],
    });
    expect(rows[0]!.claim).toBe("Germany");
    expect(rows[1]).toMatchObject({
      claim: "Atlantis",
      entity: "Could not resolve",
      period: "—",
      sourceValue: "—",
      assistant: "Atlantis",
      resolved: false,
    });
  });

  it("adds the unresolved count to the caption and marks a defaulted period as latest", () => {
    const bad = {
      citation: { marketId: "xx", label: "Atlantis" },
      resolution: resolveCitation(ds, { marketId: "xx", label: "Atlantis" }),
    };
    const noPeriod = {
      citation: { marketId: "de", label: "Germany" },
      resolution: resolveCitation(ds, { marketId: "de", label: "Germany" }),
    };
    const { rows, caption } = sourcesRows(ds, [noPeriod, bad], { items: [] });
    expect(rows[0]!.period).toBe("May 2026 (latest)");
    expect(caption).toBe(
      "Sources · data.json · attainment as given · 1 citation could not be resolved",
    );
  });
});

describe("claimTextFor", () => {
  const fx = fixtures.fixtures.find((f) => f.id === "at-risk")!;
  it("returns the mapped claim, so only the Germany latest-period chip can disagree", () => {
    expect(claimTextFor(fx.answer.text, fx.answer.citations, 0)).toBe("Germany at risk");
    const flagged = fx.answer.citations.map((c, i) => {
      const citation = CitationSchema.parse(c);
      const r = resolveCitation(ds, citation, claimTextFor(fx.answer.text, fx.answer.citations, i));
      return r.ok && r.disagreement !== undefined;
    });
    expect(flagged).toEqual([true, false, false, false]);
  });
  it("falls back to the whole text without a mapped claim", () => {
    expect(claimTextFor("A. B.", [{ label: "x" }], 0)).toBe("A. B.");
  });
});

describe("lazy series", () => {
  it("shows a dash instead of dividing by zero while the panel dataset has no series", () => {
    const light = lightDataset(ds);
    const { rows } = sourcesRows(light, resolved("germany-dip").citations, GERMANY_DIP);
    expect(rows[0]!.sourceValue).toBe("—");
  });

  it("resolves a non-latest row once the full dataset chunk has loaded", async () => {
    const full = loadFullDataset();
    expect(full.series.length).toBeGreaterThan(0);
    const { rows } = sourcesRows(full, resolved("germany-dip").citations, GERMANY_DIP);
    expect(rows[0]!.sourceValue).toBe("$1.66M actual · 91.1% of forecast");
  });
});
