import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatContext } from "@/domain";
import { loadConversation, saveConversation } from "@/features/assistant/conversationStore";
import type { Answer } from "@/features/assistant/useAnswerMachine";
import { CONVERSATION_KEY, clearConversation } from "@/lib/conversation";
import { useSlowPending } from "@/lib/context/navigation";

const calyx = {
  entity: { kind: "product", marketId: "de", productId: "calyx" },
  period: "2026-05",
} as ChatContext;

describe("the stored conversation", () => {
  it("round-trips answers with their context, and keeps a stream cut short as a stopped partial answer", () => {
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
    expect(loadConversation()).toEqual([
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

  it("drops a stored context that no longer parses, and skips entries of the wrong shape", () => {
    window.sessionStorage.setItem(
      CONVERSATION_KEY,
      JSON.stringify([
        { status: "stopped", id: "a1", question: "Q", text: "", context: { entity: "de" } },
        { status: "streaming", id: "a2", question: "Q", text: "" },
        "junk",
      ]),
    );
    expect(loadConversation()).toEqual([{ status: "stopped", id: "a1", question: "Q", text: "" }]);
  });

  it("is gone after sign-out", () => {
    saveConversation([{ status: "stopped", id: "a1", question: "Q", text: "" }]);
    clearConversation();
    expect(loadConversation()).toEqual([]);
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
