import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LIVE_INTERVAL_MS } from "@/lib/live";
import { LiveProvider, useLiveState } from "@/features/live/LiveProvider";

vi.mock("@/lib/context/useConsoleContext", () => ({
  useConsoleContext: () => ({ ctx: {}, setContext: vi.fn(), reset: vi.fn(), isPending: false }),
}));

const wrapper = ({ children }: { children: ReactNode }) => <LiveProvider>{children}</LiveProvider>;

/** Counts listeners added and removed on window and document while `run` executes. */
async function listenerBalance(run: () => Promise<void> | void) {
  const targets = [window, document] as const;
  const live = new Map<string, number>();
  const spies = targets.flatMap((t) => [
    vi.spyOn(t, "addEventListener").mockImplementation(function (this: unknown, type: string) {
      live.set(type, (live.get(type) ?? 0) + 1);
    }),
    vi.spyOn(t, "removeEventListener").mockImplementation(function (this: unknown, type: string) {
      live.set(type, (live.get(type) ?? 0) - 1);
    }),
  ]);
  try {
    await run();
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
  return Object.fromEntries([...live].filter(([, n]) => n !== 0));
}

describe("Live mode cleans up after itself", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("leaves no timer behind after Pause, and ticking stops", async () => {
    const { result } = renderHook(() => useLiveState(), { wrapper });
    act(() => result.current.setLive(true));
    await waitFor(() => expect(result.current.engine).not.toBeNull());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS * 3);
    });
    expect(result.current.tick).toBe(3);
    act(() => result.current.setLive(false));
    const timersAfterPause = vi.getTimerCount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS * 4);
    });
    expect(result.current.tick).toBe(3);
    // Only the short tween-settle timer may remain, and it has fired by now.
    expect(vi.getTimerCount()).toBeLessThanOrEqual(timersAfterPause);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("adds no window or document listener that outlives a Live session", async () => {
    const { result } = renderHook(() => useLiveState(), { wrapper });
    const left = await listenerBalance(async () => {
      act(() => result.current.setLive(true));
      await waitFor(() => expect(result.current.engine).not.toBeNull());
      await act(async () => {
        await vi.advanceTimersByTimeAsync(LIVE_INTERVAL_MS * 3);
      });
      act(() => result.current.setLive(false));
    });
    expect(left).toEqual({});
  });
});
