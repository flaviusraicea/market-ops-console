import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatMoneyCompact,
  formatMoneyFull,
  formatPct,
  formatPeriod,
  formatPeriodShort,
} from "@/lib/format";

describe("format", () => {
  it("compact money", () => {
    expect(formatMoneyCompact(22850419)).toBe("$22.85M");
    expect(formatMoneyCompact(940564)).toBe("$0.94M");
    expect(formatMoneyCompact(62818)).toBe("$62,818");
    expect(formatMoneyCompact(-1500000)).toBe("−$1.50M");
  });
  it("full money", () => {
    expect(formatMoneyFull(1676586)).toBe("1,676,586");
  });
  it("percentages", () => {
    expect(formatPct(-9.7, { sign: true })).toBe("−9.7%");
    expect(formatPct(7.3, { sign: true })).toBe("+7.3%");
    expect(formatPct(0, { sign: true })).toBe("0.0%");
    expect(formatPct(92, { sign: false })).toBe("92.0%");
  });
  it("periods and counts", () => {
    expect(formatPeriod("2026-05")).toBe("May 2026");
    expect(formatPeriodShort("2026-05")).toBe("May 26");
    expect(formatCount(6, 13)).toBe("6 of 13");
  });
});
