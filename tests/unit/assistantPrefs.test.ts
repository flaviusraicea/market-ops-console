import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PREFS, parsePrefs } from "@/domain";
import { createStoredState } from "@/lib/storedState";

describe("parsePrefs", () => {
  it("gives the defaults for nothing stored or a corrupt value", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{not json")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("42")).toEqual(DEFAULT_PREFS);
  });
  it("keeps a valid field and defaults the rest", () => {
    expect(parsePrefs('{"analyst":true}')).toEqual({ executive: true, analyst: true });
    expect(parsePrefs('{"executive":false,"analyst":"yes"}')).toEqual({
      executive: false,
      analyst: false,
    });
  });
});

describe("createStoredState", () => {
  it("round-trips a value and tells subscribers", () => {
    const state = createStoredState("test:stored", "local");
    const onChange = vi.fn();
    const off = state.subscribe(onChange);
    expect(state.read()).toBeNull();
    state.write("1");
    expect(state.read()).toBe("1");
    expect(onChange).toHaveBeenCalledTimes(1);
    off();
    state.write("2");
    expect(onChange).toHaveBeenCalledTimes(1);
  });
  it("still notifies when storage is blocked", () => {
    const state = createStoredState("test:blocked", "session");
    const onChange = vi.fn();
    state.subscribe(onChange);
    const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => state.write("1")).not.toThrow();
    expect(onChange).toHaveBeenCalledTimes(1);
    blocked.mockRestore();
  });
});
