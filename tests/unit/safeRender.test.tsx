import { render } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import data from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { CitationSchema, parseDataset, resolveCitation } from "@/domain";
import { AnswerCard } from "@/features/assistant/AnswerCard";
import { INLINE_MAP, inlineKey } from "@/features/assistant/inlineMap";
import { renderWithCitations } from "@/features/assistant/renderWithCitations";
import type { Answer } from "@/features/assistant/useAnswerMachine";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset, metaFromDataset } from "@/lib/context/invariants";
import { ConsoleMetaProvider } from "@/lib/context/meta";

const ds = parseDataset(data);

const HOSTILE = [
  '<img src=x onerror="window.pwned=1">',
  "[link](javascript:alert(1))",
  "<b>bold</b> and &lt;b&gt;bold&lt;/b&gt;",
  "{{template}} ${value} <script>window.pwned=2</script>",
].join(" ");

const done: Answer = {
  id: "a1",
  question: "q",
  status: "done",
  text: HOSTILE,
  kind: "normal",
  confidence: "high",
  citations: [],
};

afterEach(() => {
  delete (window as unknown as { pwned?: number }).pwned;
});

describe("safe rendering of model output", () => {
  it.each([
    ["done", done],
    ["streaming", { ...done, status: "streaming", controller: new AbortController() } as Answer],
    ["stopped", { id: "a1", question: "q", status: "stopped", text: HOSTILE } as Answer],
  ])("a %s answer shows hostile text as literal characters", (_name, answer) => {
    const { container } = render(
      <NuqsTestingAdapter hasMemory>
        <ConsoleMetaProvider meta={metaFromDataset(ds)}>
          <DatasetProvider dataset={lightDataset(ds)}>
            <AnswerCard answer={answer} onStop={() => {}} onRetry={() => {}} onTry={() => {}} />
          </DatasetProvider>
        </ConsoleMetaProvider>
      </NuqsTestingAdapter>,
    );
    const text = container.querySelector("p.font-display");
    expect(text?.textContent).toContain(HOSTILE);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(text?.querySelector("b")).toBeNull();
    expect(container.querySelector("a[href^='javascript' i]")).toBeNull();
    expect((window as unknown as { pwned?: number }).pwned).toBeUndefined();
  });

  it("renderWithCitations wraps only the phrases from inlineMap and never interprets markup", () => {
    const f = fixtures.fixtures.find((x) => x.id === "germany-dip")!;
    const citations = f.answer.citations
      .map((c) => CitationSchema.parse(c))
      .map((citation) => ({ citation, resolution: resolveCitation(ds, citation, f.answer.text) }));
    const phrases = (INLINE_MAP[inlineKey(citations.map((c) => c.citation))] ?? []).map(
      (p) => p.phrase,
    );
    const text = `${f.answer.text} <img src=x onerror="window.pwned=1"> [x](javascript:alert(1))`;
    const html = renderToStaticMarkup(<p>{renderWithCitations(text, citations, "a1")}</p>);
    const anchors = [...html.matchAll(/<a [^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(phrases).toContain(a);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/href="javascript/i);
    expect(html).toContain("&lt;img src=x");
  });
});
