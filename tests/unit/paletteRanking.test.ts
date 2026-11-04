import { describe, expect, it } from "vitest";

import raw from "@/data/data.json";
import type { Mode } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { buildGroups, filterGroups } from "@/features/palette/items";
import { isApplePlatform } from "@/features/palette/useShortcutLabel";

const ds = parseDataset(raw);

const labels = (query: string, mode: Mode = "executive", hasMarket = false) =>
  filterGroups(buildGroups(ds, { mode, hasMarket, reducedMotion: false }), query).flatMap((g) =>
    g.items.map((i) => i.label),
  );

describe("palette ranking", () => {
  it("puts the best match first: ana finds the Analyst view, not Canada", () => {
    expect(labels("ana")).toEqual(["Switch to Analyst deep-dive"]);
  });

  it("matches the name only, never the verb before it: ge finds Germany, not Europe", () => {
    expect(labels("ge")).toEqual(["Go to Germany", "Ask: Why did Germany dip?"]);
    expect(labels("go")).toEqual(['Ask: "go"']);
  });

  it("matches only a prefix of the name or of a word in it, so scattered letters find nothing", () => {
    expect(labels("gy")).toEqual(['Ask: "gy"']);
    expect(labels("ta")).toEqual(['Ask: "ta"']);
    expect(labels("ana", "analyst")).toEqual(['Ask: "ana"']);
  });

  it("matches a keyword by the start of one of its words: ca finds Canada only", () => {
    expect(labels("ca")).toEqual(["Go to Canada"]);
    expect(labels("dark")).toEqual(["Toggle theme"]);
    expect(labels("anim")).toEqual(["Turn reduce motion on"]);
    expect(labels("nim")).toEqual(['Ask: "nim"']);
  });

  it("orders groups by their best item, ties in catalogue order", () => {
    const groups = filterGroups(
      buildGroups(ds, { mode: "executive", hasMarket: true, reducedMotion: false }),
      "a",
    );
    expect(groups[0]?.id).toBe("markets");
    expect(groups[0]?.items[0]?.label).toBe("Go to Australia");
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
