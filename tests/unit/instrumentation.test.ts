import { afterEach, describe, expect, it, vi } from "vitest";

import { onRequestError } from "@/instrumentation";

const request = { path: "/?mode=analyst&region=eu", method: "GET", headers: {} };
const context = {
  routerKind: "App Router",
  routePath: "/",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
  renderType: "dynamic",
} as const;

describe("onRequestError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes one JSON line with the browser report's fields, the digest and where it happened", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrown = Object.assign(new Error("view model failed"), { digest: "1234567890" });
    onRequestError(thrown, request, context);
    expect(error).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(error.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(line).toMatchObject({
      origin: "server",
      level: "error",
      source: "render",
      name: "Error",
      message: "view model failed",
      digest: "1234567890",
      route: "/",
      path: "/",
      method: "GET",
      renderSource: "react-server-components",
    });
    expect(typeof line["stack"]).toBe("string");
    expect(typeof line["at"]).toBe("string");
  });

  it("keeps the query string out of the path and copes with a non-Error", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    onRequestError(
      "boom",
      { ...request, path: "/api/chat?x=1" },
      { ...context, routeType: "route" },
    );
    const line = JSON.parse(String(error.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(line).toMatchObject({ source: "route", message: "boom", path: "/api/chat" });
    expect(line).not.toHaveProperty("digest");
  });
});
