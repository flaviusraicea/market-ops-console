import { afterEach, describe, expect, it } from "vitest";

import {
  REDUCED_MOTION_KEY,
  prefersReducedMotion,
  isMotionOverrideOn,
  setReducedMotionOverride,
  toggleMotionOverride,
} from "@/lib/motion";

afterEach(() => {
  document.documentElement.removeAttribute("data-reduced-motion");
  window.localStorage.clear();
});

describe("motion", () => {
  it("prefersReducedMotion is true under the console override attribute", () => {
    document.documentElement.setAttribute("data-reduced-motion", "true");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("the override sets the attribute and is kept across reloads", () => {
    setReducedMotionOverride(true);
    expect(document.documentElement.getAttribute("data-reduced-motion")).toBe("true");
    expect(isMotionOverrideOn()).toBe(true);
    expect(window.localStorage.getItem(REDUCED_MOTION_KEY)).toBe("true");
  });

  it("turning it off clears the attribute and the stored choice", () => {
    setReducedMotionOverride(true);
    setReducedMotionOverride(false);
    expect(isMotionOverrideOn()).toBe(false);
    expect(window.localStorage.getItem(REDUCED_MOTION_KEY)).toBeNull();
  });

  it("toggling flips the switch and remembers it", () => {
    toggleMotionOverride();
    expect(isMotionOverrideOn()).toBe(true);
    expect(window.localStorage.getItem(REDUCED_MOTION_KEY)).toBe("true");
    toggleMotionOverride();
    expect(isMotionOverrideOn()).toBe(false);
    expect(window.localStorage.getItem(REDUCED_MOTION_KEY)).toBeNull();
  });
});
