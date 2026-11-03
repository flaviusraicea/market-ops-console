import { render, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { AnswerCard } from "@/features/assistant/AnswerCard";
import { INLINE_MAP, inlineKey } from "@/features/assistant/inlineMap";
import { renderWithCitations } from "@/features/assistant/renderWithCitations";
import type { Answer } from "@/features/assistant/useAnswerMachine";
import { TestProviders, resolvedFixture } from "./helpers";

const HOSTILE = [
  '<img src=x onerror="window.pwned=1">',
  "[link](javascript:alert(1))",
  "<b>bold</b> and &lt;b&gt;bold&lt;/b&gt;",
  "{{template}} ${value} <script>window.pwned=2</script>",
].join(" ");

const base = { id: "a1", question: "q" } as const;
const states: Array<[string, Answer]> = [
  [
    "done",
    { ...base, status: "done", text: HOSTILE, kind: "normal", confidence: "high", citations: [] },
  ],
  ["streaming", { ...base, status: "streaming", text: HOSTILE, controller: new AbortController() }],
  ["stopped", { ...base, status: "stopped", text: HOSTILE }],
  ["failed", { ...base, status: "failed", text: HOSTILE, message: "boom" }],
];

const pwned = () => (window as Window & { pwned?: number }).pwned;

afterEach(() => {
  delete (window as Window & { pwned?: number }).pwned;
});

describe("safe rendering of model output", () => {
  it.each(states)("a %s answer shows hostile text as literal characters", (_name, answer) => {
    const { container } = render(
      <TestProviders>
        <AnswerCard answer={answer} onStop={() => {}} onRetry={() => {}} onTry={() => {}} />
      </TestProviders>,
    );
    const text = within(container).getByText(
      (_, el) => el?.tagName === "P" && (el.textContent ?? "").startsWith(HOSTILE),
    );
    expect(text.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("a[href^='javascript' i]")).toBeNull();
    expect(pwned()).toBeUndefined();
  });

  it("renderWithCitations wraps only phrases from inlineMap and never interprets markup", () => {
    const { text: fixtureText, citations } = resolvedFixture("germany-dip");
    const phrases = (INLINE_MAP[inlineKey(citations.map((c) => c.citation))] ?? []).map(
      (p) => p.phrase,
    );
    const text = `${fixtureText} <img src=x onerror="window.pwned=1"> [x](javascript:alert(1))`;
    const html = renderToStaticMarkup(<p>{renderWithCitations(text, citations, "a1")}</p>);
    const anchors = [...html.matchAll(/<a [^>]*>([^<]*)<\/a>/g)].map((m) => m[1]);
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(phrases).toContain(a);
    expect(html).not.toContain("<img");
    expect(html).not.toMatch(/href="javascript/i);
    expect(html).toContain("&lt;img src=x");
  });
});
