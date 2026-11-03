import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/errors/route";

const post = (body: string) => POST(new Request("http://x/api/errors", { method: "POST", body }));

describe("POST /api/errors", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one server log line and returns 204", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(
      JSON.stringify({ source: "boundary", name: "TypeError", message: "boom", widget: "radar" }),
    );
    expect(res.status).toBe(204);
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      level: "error",
      origin: "client",
      source: "boundary",
      widget: "radar",
    });
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
