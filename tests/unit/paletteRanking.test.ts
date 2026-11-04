import { describe, expect, it } from "vitest";

import ds from "@/data/data.json";
import type { Dataset, Mode } from "@/domain";
import { buildGroups, filterGroups } from "@/features/palette/items";
import { isApplePlatform } from "@/features/palette/useShortcutLabel";

const labels = (query: string, mode: Mode = "executive", hasMarket = false) =>
  filterGroups(
    buildGroups(ds as unknown as Dataset, { mode, hasMarket, reducedMotion: false }),
    query,
  ).flatMap((g) => g.items.map((i) => i.label));

describe("palette ranking", () => {
  it("puts the best match first: ana finds the Analyst view, not Canada", () => {
    expect(labels("ana")).toEqual(["Switch to Analyst deep-dive"]);
  });

  it("drops weak matches once a word-start match exists: ger lists Germany, not the UK or France", () => {
    expect(labels("ger")).toEqual(["Go to Germany", "Ask: Why did Germany dip?"]);
  });

  it("falls back to in-word matches when nothing starts a word, never scattered letters", () => {
    expect(labels("ana", "analyst")).toEqual(["Go to Canada"]);
  });

  it("matches keywords only as whole-word prefixes", () => {
    expect(labels("dark")).toEqual(["Toggle theme"]);
    expect(labels("anim")).toEqual(["Turn reduce motion on"]);
    expect(labels("nim")).not.toContain("Turn reduce motion on");
  });

  it("orders groups by their best item, ties in catalogue order", () => {
    const groups = filterGroups(
      buildGroups(ds as unknown as Dataset, {
        mode: "executive",
        hasMarket: true,
        reducedMotion: false,
      }),
      "st",
    );
    expect(groups.map((g) => g.id)).toEqual(["markets", "views"]);
  });

  it("ranks products by the same rule", () => {
    expect(labels("calyx", "analyst", true)).toEqual(["Select Calyx"]);
  });

  it("offers to ask when nothing matches", () => {
    expect(labels("weather")).toEqual(['Ask: "weather"']);
  });
});

describe("the shortcut label's platform", () => {
  it("is ⌘ on Apple devices and Ctrl elsewhere", () => {
    expect(isApplePlatform({ platform: "MacIntel", userAgent: "" })).toBe(true);
    expect(isApplePlatform({ platform: "iPhone", userAgent: "" })).toBe(true);
    expect(isApplePlatform({ platform: "Win32", userAgent: "" })).toBe(false);
    expect(isApplePlatform({ platform: "Linux x86_64", userAgent: "" })).toBe(false);
  });
});
