import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatContext, Period } from "@/domain";
import { loadConversation, saveConversation } from "@/features/assistant/conversationStore";
import type { Answer } from "@/features/assistant/useAnswerMachine";
import { CONVERSATION_KEY, clearConversation } from "@/lib/conversation";
import { useSlowPending } from "@/lib/context/navigation";

import { ds } from "./helpers";

const calyx = {
  entity: { kind: "product", marketId: "de", productId: "calyx" },
  period: "2026-05",
} as ChatContext;

describe("the stored conversation", () => {
  afterEach(() => window.sessionStorage.clear());

  it("round-trips answers with their context, and keeps a stream cut short as a stopped partial answer", async () => {
    const answers: Answer[] = [
      {
        status: "streaming",
        id: "a3",
        slot: "a1",
        question: "Why did revenue dip?",
        about: "Germany · Calyx · May 2026",
        context: calyx,
        text: "Germany's revenue",
        controller: new AbortController(),
      },
      { status: "failed", id: "a4", question: "And France?", text: "", message: "offline" },
    ];
    saveConversation(answers);
    expect(await loadConversation(ds)).toEqual([
      {
        status: "stopped",
        id: "a3",
        slot: "a1",
        question: "Why did revenue dip?",
        about: "Germany · Calyx · May 2026",
        context: calyx,
        text: "Germany's revenue",
      },
      { status: "failed", id: "a4", question: "And France?", text: "", message: "offline" },
    ]);
  });

  it("stores a done answer's citations as they came off the wire and resolves them again on restore", async () => {
    const citation = { marketId: "de", period: "2026-03" as Period, label: "Germany, Mar 2026" };
    const done: Answer = {
      status: "done",
      id: "a1",
      question: "Why did Germany dip?",
      text: "Germany is at risk.",
      kind: "normal",
      confidence: "high",
      citations: [
        { citation, resolution: { ok: false, reason: "unknown_market", label: "stale" } },
      ],
    };
    saveConversation([done]);
    const stored = JSON.parse(window.sessionStorage.getItem(CONVERSATION_KEY) ?? "[]") as {
      citations: unknown[];
    }[];
    expect(stored[0]?.citations).toEqual([citation]);
    const [restored] = await loadConversation(ds);
    expect(restored?.status === "done" && restored.citations[0]?.resolution.ok).toBe(true);
  });

  it("drops a stored context that no longer parses, and skips entries of the wrong shape", async () => {
    window.sessionStorage.setItem(
      CONVERSATION_KEY,
      JSON.stringify([
        { status: "stopped", id: "a1", question: "Q", text: "", context: { entity: "de" } },
        { status: "streaming", id: "a2", question: "Q", text: "" },
        { status: "failed", id: "a3", question: "Q", text: "" },
        { status: "done", id: "a4", question: "Q", text: "", citations: [{ label: 1 }] },
        { status: "done", id: "a5", question: "Q", text: "", kind: "normal", confidence: "high" },
        "junk",
      ]),
    );
    expect(await loadConversation(ds)).toEqual([
      { status: "stopped", id: "a1", question: "Q", text: "" },
    ]);
  });

  it("reads only the current version of the stored shape", async () => {
    window.sessionStorage.setItem(
      "mo.conversation",
      JSON.stringify([{ status: "stopped", id: "a1", question: "Q", text: "" }]),
    );
    expect(await loadConversation(ds)).toEqual([]);
  });

  it("is gone after sign-out", async () => {
    saveConversation([{ status: "stopped", id: "a1", question: "Q", text: "" }]);
    clearConversation();
    expect(await loadConversation(ds)).toEqual([]);
  });
});

describe("useSlowPending", () => {
  afterEach(() => vi.useRealTimers());

  it("turns on only after the navigation has been pending for 250 ms, and off as soon as it ends", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ pending }) => useSlowPending(pending), {
      initialProps: { pending: false },
    });
    rerender({ pending: true });
    act(() => vi.advanceTimersByTime(249));
    expect(result.current).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(true);
    rerender({ pending: false });
    expect(result.current).toBe(false);
  });

  it("never turns on for a navigation that ends within 250 ms", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ pending }) => useSlowPending(pending), {
      initialProps: { pending: true },
    });
    act(() => vi.advanceTimersByTime(200));
    rerender({ pending: false });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe(false);
  });
});
