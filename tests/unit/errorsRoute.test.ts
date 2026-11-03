import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/errors/route";

const report = (over: Record<string, unknown> = {}) => ({
  level: "error",
  source: "fetch",
  name: "TypeError",
  message: "boom",
  at: "2026-11-03T08:00:00.000Z",
  ...over,
});
const post = (body: string) => POST(new Request("http://x/api/errors", { method: "POST", body }));

describe("POST /api/errors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one server log line and returns 204", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(JSON.stringify(report({ source: "boundary", widget: "radar" })));
    expect(res.status).toBe(204);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      level: "error",
      origin: "client",
      source: "boundary",
      widget: "radar",
    });
  });

  it.each(["stream", "fetch"])("accepts a %s failure with the route it came from", async (source) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(JSON.stringify(report({ source, route: "/api/chat" })));
    expect(res.status).toBe(204);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({ source, route: "/api/chat" });
  });

  it("refuses a body over the cap without reading it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const big = JSON.stringify(report({ message: "x".repeat(5000) }));
    const res = await POST(
      new Request("http://x/api/errors", {
        method: "POST",
        body: big,
        headers: { "content-length": String(big.length) },
      }),
    );
    expect(res.status).toBe(413);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown source", report({ source: "nope" })],
    ["an empty message", report({ message: "" })],
    ["a message over 500 characters", report({ message: "x".repeat(501) })],
    ["no timestamp", { ...report(), at: undefined }],
  ])("rejects %s", async (_label, body) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post(JSON.stringify(body))).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each(["not json", "42", "{}", JSON.stringify({ source: "nope", message: "x" })])(
    "rejects %s without logging",
    async (body) => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      expect((await post(body)).status).toBe(400);
      expect(spy).not.toHaveBeenCalled();
    },
  );
});
