import { describe, expect, it } from "vitest";

import { DELETE, GET, POST } from "@/app/api/alerts/route";

const post = (body: unknown, query = "") =>
  POST(
    new Request(`http://test/api/alerts${query}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const rule = {
  metric: "attainment",
  comparator: "below",
  threshold: 95,
  scope: { regionId: "eu" },
};

describe("/api/alerts", () => {
  it("rejects an invalid rule with 400 and an issue at threshold", async () => {
    const res = await post({ ...rule, threshold: 120 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { issues: { path: string[]; message: string }[] };
    expect(body.issues[0]?.path).toEqual(["threshold"]);
    expect(body.issues[0]?.message).toBe("Enter a value between 0 and 100.");
  });

  it("saves a valid rule with an id and createdAt, and lists it", async () => {
    const res = await post(rule);
    expect(res.status).toBe(200);
    const { rule: saved } = (await res.json()) as { rule: { id: string; createdAt: string } };
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();

    const list = (await (await GET()).json()) as { rules: { id: string }[] };
    expect(list.rules.map((r) => r.id)).toContain(saved.id);
  });

  it("saving the same metric and scope again updates the rule", async () => {
    const first = ((await (await post(rule)).json()) as { rule: { id: string } }).rule;
    const second = (
      (await (await post({ ...rule, threshold: 97 })).json()) as {
        rule: { id: string; threshold: number };
      }
    ).rule;
    expect(second.id).toBe(first.id);
    expect(second.threshold).toBe(97);
  });

  it("returns 500 with a message when ?fail=1 and stores nothing", async () => {
    const before = ((await (await GET()).json()) as { rules: unknown[] }).rules.length;
    const res = await post({ ...rule, scope: { regionId: "apac" } }, "?fail=1");
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Save failed (simulated)" });
    const after = ((await (await GET()).json()) as { rules: unknown[] }).rules.length;
    expect(after).toBe(before);
  });

  it("deletes with 204", async () => {
    const { rule: saved } = (await (await post({ ...rule, scope: "portfolio" })).json()) as {
      rule: { id: string };
    };
    const res = await DELETE(
      new Request(`http://test/api/alerts?id=${saved.id}`, { method: "DELETE" }),
    );
    expect(res.status).toBe(204);
    const list = (await (await GET()).json()) as { rules: { id: string }[] };
    expect(list.rules.map((r) => r.id)).not.toContain(saved.id);
  });
});
