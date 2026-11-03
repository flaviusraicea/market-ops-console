import { afterEach, describe, expect, it, vi } from "vitest";

import { createStoredState } from "@/lib/storedState";

describe("createStoredState", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the last value in memory when storage refuses it, so the choice lasts until reload", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    vi.stubGlobal("window", {
      localStorage: blocked,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const state = createStoredState("k", "local");
    const onChange = vi.fn();
    state.subscribe(onChange);
    expect(state.read()).toBeNull();
    state.write("collapsed");
    expect(state.read()).toBe("collapsed");
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("reads through to storage when it works", () => {
    const store = new Map<string, string>();
    const ok = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    vi.stubGlobal("window", {
      localStorage: ok,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const state = createStoredState("k", "local");
    state.write("open");
    expect(store.get("k")).toBe("open");
    store.set("k", "closed");
    expect(state.read()).toBe("closed");
  });
});
