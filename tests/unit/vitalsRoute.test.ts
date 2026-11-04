import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/vitals/route";

const vital = (over: Record<string, unknown> = {}) => ({
  name: "LCP",
  value: 1234.5,
  rating: "good",
  id: "v5-1",
  ...over,
});
const post = (body: string) => POST(new Request("http://x/api/vitals", { method: "POST", body }));

describe("POST /api/vitals", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one server log line and returns 204", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await post(JSON.stringify(vital()));
    expect(res.status).toBe(204);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toEqual({
      origin: "client",
      kind: "vital",
      ...vital(),
    });
  });

  it.each([
    ["an unknown metric", vital({ name: "XYZ" })],
    ["a negative value", vital({ value: -1 })],
    ["an unknown rating", vital({ rating: "great" })],
  ])("refuses %s with 400 and logs nothing", async (_, body) => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const res = await post(JSON.stringify(body));
    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    expect((await post("not json")).status).toBe(400);
  });

  it("refuses a body over the cap", async () => {
    const res = await post(JSON.stringify(vital({ id: "x".repeat(2000) })));
    expect(res.status).toBe(413);
  });
});
