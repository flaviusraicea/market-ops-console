import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAnswerMachine } from "@/features/assistant/useAnswerMachine";
import type { AskStream, AskStreamOptions } from "@/lib/stream/chatClient";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset } from "@/lib/context/invariants";
import { ds } from "./helpers";

// The brief: "no jank while streaming". Tokens arrive faster than frames; the text must update once per frame.
let frames: Map<number, FrameRequestCallback>;
let nextFrame: number;
const runFrame = () => {
  const queued = [...frames.values()];
  frames.clear();
  act(() => queued.forEach((cb) => cb(performance.now())));
};

beforeEach(() => {
  frames = new Map();
  nextFrame = 1;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(nextFrame, cb);
    return nextFrame++;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => vi.unstubAllGlobals());

const wrapper = ({ children }: { children: ReactNode }) => (
  <DatasetProvider dataset={lightDataset(ds)}>{children}</DatasetProvider>
);

/** A stream the test drives by hand. */
function controlledStream() {
  let options: AskStreamOptions | undefined;
  const stream: AskStream = (_q, o) => {
    options = o;
    return new Promise<void>(() => {});
  };
  const emit = (event: Parameters<AskStreamOptions["onEvent"]>[0]) =>
    act(() => options?.onEvent(event));
  return { stream, emit };
}

const text = (r: { current: ReturnType<typeof useAnswerMachine> }) => r.current.answers[0]?.text;

describe("token batching", () => {
  it("20 tokens inside one frame make one update, applied when the frame runs", () => {
    const { stream, emit } = controlledStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    act(() => result.current.ask("q"));
    for (let i = 0; i < 20; i++) emit({ type: "token", value: `t${i} ` });

    expect(text(result)).toBe("");
    expect(frames.size).toBe(1);

    runFrame();
    expect(text(result)).toBe(Array.from({ length: 20 }, (_, i) => `t${i} `).join(""));
    expect(frames.size).toBe(0);
  });

  it("the next token after a frame schedules a new frame", () => {
    const { stream, emit } = controlledStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    act(() => result.current.ask("q"));
    emit({ type: "token", value: "a" });
    runFrame();
    emit({ type: "token", value: "b" });
    emit({ type: "token", value: "c" });
    expect(text(result)).toBe("a");
    runFrame();
    expect(text(result)).toBe("abc");
  });

  it("done flushes pending tokens without waiting for a frame", () => {
    const { stream, emit } = controlledStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    act(() => result.current.ask("q"));
    emit({ type: "token", value: "last words" });
    emit({ type: "done", kind: "normal", confidence: "high", citations: [] });
    expect(result.current.answers[0]).toMatchObject({ status: "done", text: "last words" });
    expect(frames.size).toBe(0);
  });
});
