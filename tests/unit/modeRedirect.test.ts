import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";
import { ROLE_COOKIE } from "@/lib/roles";

const call = (url: string, cookie?: string) =>
  proxy(new NextRequest(url, cookie ? { headers: { cookie } } : undefined));

describe("proxy: mode=overview redirect", () => {
  it("redirects an old link permanently, keeping every other parameter", () => {
    const res = call("http://localhost/?mode=overview&market=de");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe("http://localhost/?mode=executive&market=de");
  });
  it("redirects before it touches the role cookie", () => {
    expect(call("http://localhost/?mode=overview").headers.get("set-cookie")).toBeNull();
  });
  it("leaves the current values alone", () => {
    expect(call("http://localhost/?mode=analyst", `${ROLE_COOKIE}=analyst`).status).toBe(200);
  });
});

describe("proxy: first visit", () => {
  it("signs in as Executive with a one-year, lax cookie", () => {
    const res = call("http://localhost/");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/market-ops-role=executive/);
    expect(cookie).toMatch(/Max-Age=31536000/);
    expect(cookie).toMatch(/SameSite=lax/i);
  });
  it("replaces an unknown role value", () => {
    expect(call("http://localhost/", `${ROLE_COOKIE}=root`).headers.get("set-cookie")).toMatch(
      /market-ops-role=executive/,
    );
  });
  it("keeps a role already chosen", () => {
    expect(
      call("http://localhost/", `${ROLE_COOKIE}=analyst`).headers.get("set-cookie"),
    ).toBeNull();
  });
  it("does not sign anyone in on the sign-in screen or the API", () => {
    expect(call("http://localhost/sign-in").headers.get("set-cookie")).toBeNull();
    expect(call("http://localhost/api/alerts").headers.get("set-cookie")).toBeNull();
  });
});
