import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { DELETE as signOut, POST as signIn } from "@/app/api/session/route";
import { DELETE, POST } from "@/app/api/alerts/route";
import raw from "@/data/data.json";
import { parseDataset } from "@/domain";
import { parseContextFromSearchParams } from "@/lib/context/parsers";
import { ROLE_COOKIE, defaultModeFor } from "@/lib/roles";

const ds = parseDataset(raw);

describe("default mode by role", () => {
  it("opens an Executive on the executive view and an Analyst on the analyst view", () => {
    expect(parseContextFromSearchParams(ds, {}, defaultModeFor("executive")).mode).toBe(
      "executive",
    );
    expect(parseContextFromSearchParams(ds, {}, defaultModeFor("analyst")).mode).toBe("analyst");
  });
  it("lets an explicit mode in the URL win over the role", () => {
    expect(parseContextFromSearchParams(ds, { mode: "executive" }, "analyst").mode).toBe(
      "executive",
    );
    expect(parseContextFromSearchParams(ds, { mode: "analyst" }, "executive").mode).toBe("analyst");
  });
  it("reads the pre-rename value overview as executive", () => {
    expect(parseContextFromSearchParams(ds, { mode: "overview" }, "analyst").mode).toBe(
      "executive",
    );
  });
});

const session = (body: unknown) =>
  signIn(
    new Request("http://test/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/session", () => {
  it("sets the role cookie for a valid role", async () => {
    const res = await session({ role: "analyst" });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/market-ops-role=analyst/);
    expect(res.headers.get("set-cookie")).toMatch(/SameSite=lax/i);
  });
  it("rejects an unknown role and a body that is not JSON", async () => {
    expect((await session({ role: "admin" })).status).toBe(400);
    expect((await session("not json")).status).toBe(400);
  });
  it("clears the cookie on sign out", async () => {
    const res = await signOut();
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toMatch(/market-ops-role=;/);
  });
});

describe("/api/alerts is read-only for an Executive", () => {
  const rule = {
    metric: "attainment",
    comparator: "below",
    threshold: 95,
    scope: "portfolio",
  };
  const headers = (role: string) => ({
    "content-type": "application/json",
    cookie: `${ROLE_COOKIE}=${role}`,
  });

  it("returns 403 read_only_role for POST and DELETE", async () => {
    const post = await POST(
      new NextRequest("http://test/api/alerts", {
        method: "POST",
        headers: headers("executive"),
        body: JSON.stringify(rule),
      }),
    );
    expect(post.status).toBe(403);
    expect(await post.json()).toMatchObject({ error: "read_only_role" });
    const del = await DELETE(
      new NextRequest("http://test/api/alerts?id=x", {
        method: "DELETE",
        headers: headers("executive"),
      }),
    );
    expect(del.status).toBe(403);
  });
  it("treats a request with no cookie as the default persona, so it is read-only too", async () => {
    const res = await POST(
      new NextRequest("http://test/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(rule),
      }),
    );
    expect(res.status).toBe(403);
  });
  it("lets an Analyst save", async () => {
    const res = await POST(
      new NextRequest("http://test/api/alerts", {
        method: "POST",
        headers: headers("analyst"),
        body: JSON.stringify(rule),
      }),
    );
    expect(res.status).toBe(200);
  });
});
