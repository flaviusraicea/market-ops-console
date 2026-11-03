import type { Period } from "@/domain";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  AskWhyProvider,
  useAskWhy,
  useAskWhyRequest,
  useRegisterAskSender,
  type AskContext,
} from "@/features/assistant/askWhy";
import { askContext, askLabel, cellQuestion, momPct } from "@/features/assistant/questions";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AskWhyProvider>{children}</AskWhyProvider>
);

const germany: AskContext = askContext(
  { kind: "market", marketId: "de" },
  "Germany",
  "2026-03" as Period,
);

describe("cellQuestion", () => {
  it("says dip for a fall of 10 percent or more", () => {
    expect(cellQuestion("Germany", "2026-03", -27)).toBe(
      "Why did Germany's revenue dip in Mar 2026?",
    );
    expect(cellQuestion("Germany", "2026-03", -10)).toContain("dip");
  });
  it("says change otherwise, and for the first month", () => {
    expect(cellQuestion("Germany", "2026-04", 3.2)).toBe(
      "Why did Germany's revenue change in Apr 2026?",
    );
    expect(cellQuestion("Germany", "2026-04", -9.9)).toContain("change");
    expect(cellQuestion("Germany", "2024-06", null)).toContain("change");
  });
  it("computes month-on-month change", () => {
    expect(momPct(73, 100)).toBeCloseTo(-27);
    expect(momPct(73, undefined)).toBeNull();
  });
  it("labels the context", () => {
    expect(askLabel("Germany", "2026-05")).toBe("Germany · May 2026");
    expect(germany).toEqual({
      entity: { kind: "market", marketId: "de" },
      period: "2026-03",
      label: "Germany · Mar 2026",
    });
  });
});

describe("ask and prefill requests", () => {
  function setup(canSend: boolean) {
    return renderHook(
      () => {
        useRegisterAskSender(() => canSend);
        return { ...useAskWhy(), request: useAskWhyRequest() };
      },
      { wrapper },
    );
  }

  it("prefill fills and never sends, carrying the context and its source", () => {
    const { result } = setup(true);
    act(() => result.current.prefill("Why?", germany, "the heat map cell"));
    expect(result.current.request).toMatchObject({
      text: "Why?",
      fill: true,
      ctx: germany,
      from: "the heat map cell",
    });
  });

  it("ask sends when the panel can, so nothing is filled", () => {
    const { result } = setup(true);
    act(() => result.current.ask("Why?", germany));
    expect(result.current.request).toMatchObject({ fill: false, ctx: germany });
  });

  it("ask falls back to filling when the panel is busy", () => {
    const { result } = setup(false);
    act(() => result.current.ask("Why?", germany));
    expect(result.current.request).toMatchObject({ fill: true, ctx: germany });
  });

  it("each request has a new nonce", () => {
    const { result } = setup(true);
    act(() => result.current.prefill("a"));
    const first = result.current.request?.nonce;
    act(() => result.current.prefill("a"));
    expect(result.current.request?.nonce).toBe((first ?? 0) + 1);
  });
});
