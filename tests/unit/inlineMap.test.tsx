import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import data from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { CitationSchema, parseDataset, resolveCitation } from "@/domain";
import { renderWithCitations } from "@/features/assistant/renderWithCitations";
import { segmentText } from "@/features/assistant/inlineMap";

const ds = parseDataset(data);

function resolved(id: string) {
  const f = fixtures.fixtures.find((x) => x.id === id)!;
  const citations = f.answer.citations.map((c) => CitationSchema.parse(c));
  return {
    text: f.answer.text,
    citations: citations.map((citation) => ({
      citation,
      resolution: resolveCitation(ds, citation, f.answer.text),
    })),
  };
}

describe("inline citations", () => {
  it("wraps the three Germany-dip phrases in cite-inline anchors", () => {
    const { text, citations } = resolved("germany-dip");
    const html = renderToStaticMarkup(<p>{renderWithCitations(text, citations, "a1")}</p>);
    const anchors = [...html.matchAll(/<a [^>]*class="cite-inline"[^>]*>([^<]*)<\/a>/g)];
    expect(anchors.map((m) => m[1])).toEqual([
      "early 2026",
      "steepest drop in March",
      "across the product portfolio",
    ]);
    expect(html).toContain('href="#chip-a1-1"');
  });
  it("matches only the first occurrence of a phrase", () => {
    const { text, citations } = resolved("at-risk");
    const cited = segmentText(
      text,
      citations.map((c) => c.citation),
    ).filter((s) => s.citationIndex !== undefined);
    expect(cited.map((s) => s.text)).toEqual(["Germany", "sharp dip in March", "Italy", "Brazil"]);
  });
  it("leaves text without a mapping untouched", () => {
    const { text, citations } = resolved("next-year");
    expect(
      segmentText(
        text,
        citations.map((c) => c.citation),
      ),
    ).toEqual([{ text }]);
  });
});
