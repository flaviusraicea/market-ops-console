import { describe, expect, it } from "vitest";

import { toPeriod } from "@/domain";
import { PeriodSchema } from "@/domain/dataset";

describe("toPeriod", () => {
  it.each(["2026-03", "2024-12", "1999-01"])("accepts %s", (p) => {
    expect(toPeriod(p)).toBe(p);
  });
  it.each(["2026-13", "2026-00", "26-03", "2026-3", "2026-03-01", "", "March"])(
    "rejects %s, as PeriodSchema does",
    (p) => {
      expect(() => toPeriod(p)).toThrow();
      expect(PeriodSchema.safeParse(p).success).toBe(false);
    },
  );
});
