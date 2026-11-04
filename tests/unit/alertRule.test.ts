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
  // The shape is right but the moment does not exist, or seconds are missing (review S3).
  ...[
    "2026-11-04T08:00Z",
    "2026-11-04T25:00:00Z",
    "2026-11-04T24:00:00Z",
    "2026-11-04T08:60:00Z",
    "2026-11-04T08:00:60Z",
    "2026-02-30T08:00:00Z",
    "2026-13-01T08:00:00Z",
    "2026-00-10T08:00:00Z",
    "2026-04-31T08:00:00Z",
    "2025-02-29T08:00:00Z",
    "0000-00-00T00:00:00Z",
    "2026-11-04T08:00:00.Z",
    "2026-11-04t08:00:00z",
  ].map((createdAt) => ({ ...valid, createdAt })),
  // Edge moments that do exist.
  ...[
    "2024-02-29T23:59:59Z",
    "2000-02-29T00:00:00Z",
    "2026-12-31T23:59:59.999999Z",
    "0001-01-01T00:00:00Z",
  ].map((createdAt) => ({ ...valid, createdAt })),
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
