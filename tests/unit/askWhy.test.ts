import { describe, expect, it } from "vitest";

import data from "@/data/data.json";
import { askWhyPrompt, prefillFor } from "@/domain";
import { parseDataset } from "@/domain/dataset";

const ds = parseDataset(data);
const market = (name: string) => ds.markets.find((m) => m.name === name)!;

describe("prefillFor", () => {
  it("asks about the dip for a market with a dip anomaly", () => {
    expect(prefillFor(market("Germany"))).toBe("Why did Germany's revenue dip?");
  });
  it("asks about the status otherwise", () => {
    expect(prefillFor(market("Spain"))).toBe("Why is Spain off track?");
    expect(prefillFor(market("China"))).toBe("Why is China on track?");
  });
});

describe("askWhyPrompt", () => {
  it("names the button after the question it fills in", () => {
    expect(askWhyPrompt(market("Germany"))).toEqual({
      aria: "Ask why Germany dipped",
      text: "Why did Germany's revenue dip?",
    });
    expect(askWhyPrompt(market("Spain")).aria).toBe("Ask why Spain is off track");
  });
});
