import { describe, expect, it } from "vitest";

import { parseAlertRule } from "@/domain/alertRule";
import { AlertRuleSchema } from "@/domain/alerts";

const valid = { metric: "growth", comparator: "below", threshold: -5, scope: "portfolio" };

/** Inputs the hand-written parse must judge exactly as the schema does. */
const CASES: unknown[] = [
  valid,
  { ...valid, id: "r1", createdAt: "2026-11-04T08:00:00.000Z" },
  { ...valid, createdAt: "2026-11-04T08:00:00Z" },
  { ...valid, metric: "attainment", threshold: 95, scope: { regionId: "eu" } },
  { ...valid, scope: { marketId: "de" } },
  { ...valid, metric: "attainment", threshold: 100 },
  { ...valid, metric: "attainment", threshold: 0 },
  { ...valid, threshold: -100 },
  { ...valid, threshold: 100 },
  { ...valid, extra: "dropped" },
  // Invalid:
  { ...valid, metric: "attainment", threshold: 120 },
  { ...valid, metric: "attainment", threshold: -1 },
  { ...valid, threshold: -150 },
  { ...valid, threshold: Number.NaN },
  { ...valid, threshold: Number.POSITIVE_INFINITY },
  { ...valid, threshold: "5" },
  { ...valid, metric: "units" },
  { ...valid, comparator: "above" },
  { ...valid, scope: "world" },
  { ...valid, scope: { regionId: "mars" } },
  { ...valid, scope: { marketId: 7 } },
  { ...valid, id: 3 },
  { ...valid, createdAt: "yesterday" },
  { ...valid, createdAt: "2026-11-04" },
  { ...valid, createdAt: "2026-11-04T08:00:00+02:00" },
  null,
  "junk",
  [],
];

describe("parseAlertRule", () => {
  it.each(CASES.map((c) => [JSON.stringify(c) ?? String(c), c]))(
    "agrees with AlertRuleSchema on %s",
    (_, input) => {
      const schema = AlertRuleSchema.safeParse(input);
      expect(parseAlertRule(input)).toEqual(schema.success ? schema.data : null);
    },
  );
});
