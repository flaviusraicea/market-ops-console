import { describe, expect, it } from "vitest";

import { DELETE, POST } from "@/app/api/alerts/route";

const post = (body: unknown, query = "") =>
  POST(
    new Request(`http://test/api/alerts${query}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "market-ops-role=analyst" },
      body: JSON.stringify(body),
    }),
  );

const rule = {
  metric: "attainment",
  comparator: "below",
  threshold: 95,
  scope: { regionId: "eu" },
};

describe("/api/alerts (mock backend: validates, waits, can fail, stores nothing)", () => {
  it("rejects an invalid rule with 400 and an issue at threshold", async () => {
    const res = await post({ ...rule, threshold: 120 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { issues: { path: string[]; message: string }[] };
    expect(body.issues[0]?.path).toEqual(["threshold"]);
    expect(body.issues[0]?.message).toBe("Enter a value between 0 and 100.");
  });

  it("confirms a valid rule with an id and createdAt, keeping a given id", async () => {
    const { rule: saved } = (await (await post(rule)).json()) as {
      rule: { id: string; createdAt: string };
    };
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    const again = (await (await post({ ...rule, id: "keep" })).json()) as { rule: { id: string } };
    expect(again.rule.id).toBe("keep");
  });

  it("returns 500 with a message when ?fail=1", async () => {
    const res = await post(rule, "?fail=1");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Save failed (simulated)" });
  });

  it("deletes with 204, and 400 without an id", async () => {
    const ok = await DELETE(
      new Request("http://test/api/alerts?id=x", {
        method: "DELETE",
        headers: { cookie: "market-ops-role=analyst" },
      }),
    );
    expect(ok.status).toBe(204);
    const bad = await DELETE(
      new Request("http://test/api/alerts", {
        method: "DELETE",
        headers: { cookie: "market-ops-role=analyst" },
      }),
    );
    expect(bad.status).toBe(400);
  });
});
