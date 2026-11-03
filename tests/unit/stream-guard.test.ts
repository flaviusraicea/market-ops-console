import { describe, expect, it } from "vitest";

import { isSseEvent, parseSseLineLite } from "@/domain";
import { SseEventSchema } from "@/domain/stream";

const valid: unknown[] = [
  { type: "token", value: "Three " },
  { type: "token", value: "" },
  { type: "done", kind: "normal", citations: [], confidence: "high" },
  {
    type: "done",
    kind: "low_confidence",
    confidence: "low",
    citations: [{ marketId: "de", period: "2026-03", label: "Germany, Mar 2026" }, {}],
  },
  { type: "error", message: "Something broke" },
];

const malformed: unknown[] = [
  null,
  "token",
  42,
  [],
  {},
  { type: "nope" },
  { type: "token" },
  { type: "token", value: 1 },
  { type: "error" },
  { type: "error", message: 5 },
  { type: "done", kind: "normal", confidence: "high" },
  { type: "done", kind: "unknown", citations: [], confidence: "high" },
  { type: "done", kind: "normal", citations: [], confidence: "certain" },
  { type: "done", kind: "normal", citations: "none", confidence: "high" },
  { type: "done", kind: "normal", citations: [null], confidence: "high" },
  { type: "done", kind: "normal", citations: [{ period: "2026-13" }], confidence: "high" },
  { type: "done", kind: "normal", citations: [{ marketId: 7 }], confidence: "high" },
];

describe("isSseEvent", () => {
  it.each(valid.map((v, i) => [i, v] as const))("accepts valid event %i", (_i, event) => {
    expect(isSseEvent(event)).toBe(true);
  });

  it.each(malformed.map((v, i) => [i, v] as const))("rejects malformed value %i", (_i, value) => {
    expect(isSseEvent(value)).toBe(false);
  });

  it("agrees with the zod contract on every sample", () => {
    for (const sample of [...valid, ...malformed]) {
      expect(isSseEvent(sample), JSON.stringify(sample)).toBe(
        SseEventSchema.safeParse(sample).success,
      );
    }
  });
});

describe("parseSseLineLite", () => {
  it("parses a data line", () => {
    expect(parseSseLineLite('data: {"type":"token","value":"Hi"}')).toEqual({
      type: "token",
      value: "Hi",
    });
  });
  it("returns null for blanks, comments and other fields", () => {
    expect(parseSseLineLite("")).toBeNull();
    expect(parseSseLineLite(": ping")).toBeNull();
    expect(parseSseLineLite("event: message")).toBeNull();
  });
  it("throws on bad JSON and on an unknown shape", () => {
    expect(() => parseSseLineLite("data: {nope")).toThrow();
    expect(() => parseSseLineLite('data: {"type":"nope"}')).toThrow();
  });
});
