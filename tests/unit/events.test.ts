import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_ENDPOINT, getEventLog, reportError, resetErrorReporting } from "@/lib/events";

describe("reportError", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetErrorReporting();
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("writes one structured JSON line with the fields a log drain needs", () => {
    const report = reportError(new TypeError("boom"), { source: "boundary", widget: "heat-map" });
    expect(consoleError).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      level: "error",
      source: "boundary",
      widget: "heat-map",
      name: "TypeError",
      message: "boom",
    });
    expect(typeof line.at).toBe("string");
    expect(line.stack.split("\n").length).toBeLessThanOrEqual(6);
    expect(report.message).toBe("boom");
  });

  it("records the request a stream or fetch failure came from", () => {
    const report = reportError(new Error("closed"), { source: "stream", route: "/api/chat" });
    expect(report).toMatchObject({ source: "stream", route: "/api/chat" });
    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toMatchObject({
      source: "stream",
      route: "/api/chat",
    });
  });

  it("cuts fields to the limits the endpoint accepts, so a long message is still delivered", () => {
    const report = reportError("x".repeat(900), { source: "fetch", route: "/api/alerts" });
    expect(report.message).toHaveLength(500);
  });

  it("keeps the report in the event log", () => {
    reportError("plain text failure", { source: "window" });
    const last = getEventLog().at(-1);
    expect(last?.type).toBe("error");
    expect(last && last.type === "error" && last.report.message).toBe("plain text failure");
  });

  it("describes values that are not errors", () => {
    expect(reportError({ code: 7 }).message).toBe('{"code":7}');
    expect(reportError(undefined).message).toBe("undefined");
  });

  it("reports the same error once per window", () => {
    for (let i = 0; i < 5; i++) reportError(new Error("loop"), { source: "window" });
    expect(consoleError).toHaveBeenCalledTimes(1);
    reportError(new Error("other"), { source: "window" });
    expect(consoleError).toHaveBeenCalledTimes(2);
  });

  it("beacons to the error endpoint in production only, and caps the count", () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal("navigator", { sendBeacon });
    reportError(new Error("dev"));
    expect(sendBeacon).not.toHaveBeenCalled();

    vi.stubEnv("NODE_ENV", "production");
    reportError(new Error("prod"), { source: "promise" });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = sendBeacon.mock.calls[0] as unknown as [string, string];
    expect(url).toBe(ERROR_ENDPOINT);
    expect(JSON.parse(body)).toMatchObject({ source: "promise", message: "prod" });

    for (let i = 0; i < 40; i++) reportError(new Error(`distinct ${i}`));
    expect(sendBeacon).toHaveBeenCalledTimes(20);
  });

  it("never throws, even when the beacon does", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubGlobal("navigator", {
      sendBeacon: () => {
        throw new Error("blocked");
      },
    });
    expect(() => reportError(new Error("x"))).not.toThrow();
  });
});
