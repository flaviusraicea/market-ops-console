import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlertRule } from "@/domain";
import { STORAGE_KEY, readRules, resetMemory } from "@/features/alerts/storage";
import { useAlertSave } from "@/features/alerts/useAlertSave";

const saved: AlertRule = {
  id: "r1",
  metric: "attainment",
  comparator: "below",
  threshold: 95,
  scope: { regionId: "eu" },
};
const next: AlertRule = { ...saved, id: undefined, threshold: 97 };

const ok = (body: unknown, status = 200) => Promise.resolve(Response.json(body, { status }));

function setup(handler: (url: string, init?: RequestInit) => Promise<Response>, seed = true) {
  if (seed) window.localStorage.setItem(STORAGE_KEY, JSON.stringify([saved]));
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { fetchMock, ...renderHook(() => useAlertSave(), { wrapper }) };
}

beforeEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  resetMemory();
});
afterEach(() => vi.unstubAllGlobals());

describe("useAlertSave", () => {
  it("shows the row as pending before the response arrives", async () => {
    let release: (r: Response) => void = () => {};
    const { result } = setup((url, init) => {
      if (init?.method === "POST") return new Promise((r) => (release = r));
      return ok({ rules: [saved] });
    });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => result.current.save([next], { fail: false }));
    await waitFor(() =>
      expect(result.current.rules[0]).toMatchObject({ threshold: 97, pending: true }),
    );
    expect(result.current.status).toBe("saving");

    await act(async () => release(Response.json({ rule: { ...next, id: "r1" } })));
    await waitFor(() => expect(result.current.status).toBe("saved"));
  });

  it("restores the snapshot and sets failure on a 500", async () => {
    const { result } = setup((url, init) => {
      if (init?.method === "POST") return ok({ message: "Save failed (simulated)" }, 500);
      return ok({ rules: [saved] });
    });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => result.current.save([next], { fail: true }));
    await waitFor(() => expect(result.current.failure).not.toBeNull());

    expect(result.current.rules[0]).toMatchObject({ threshold: 95 });
    expect(result.current.rules[0]?.pending).toBeUndefined();
    expect(result.current.failure?.restored).toEqual({ growth: 0, attainment: 95 });
  });

  it("marks a 403 read_only_role as read-only, for a save and for a delete", async () => {
    const refuse = () =>
      ok({ error: "read_only_role", message: "Rules are read-only for Executives." }, 403);
    const { result } = setup((url, init) => (init?.method ? refuse() : ok({ rules: [saved] })));
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => result.current.save([next], { fail: false }));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    expect(result.current.failure?.readOnly).toBe(true);
    expect(result.current.rules[0]).toMatchObject({ threshold: 95 });

    act(() => result.current.remove("r1"));
    await waitFor(() => expect(result.current.deleteFailed).toBe(true));
    expect(result.current.deleteReadOnly).toBe(true);
    expect(result.current.rules).toHaveLength(1);
  });

  it("a plain 500 is not read-only", async () => {
    const { result } = setup((url, init) =>
      init?.method === "POST"
        ? ok({ message: "Save failed (simulated)" }, 500)
        : ok({ rules: [saved] }),
    );
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    act(() => result.current.save([next], { fail: true }));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    expect(result.current.failure?.readOnly).toBe(false);
  });

  it("Try again posts the same payload again", async () => {
    let posts = 0;
    const { result, fetchMock } = setup((url, init) => {
      if (init?.method === "POST") {
        posts += 1;
        return posts === 1
          ? ok({ message: "Save failed (simulated)" }, 500)
          : ok({ rule: { ...next, id: "r1" } });
      }
      return ok({ rules: [saved] });
    });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    act(() => result.current.save([next], { fail: true }));
    await waitFor(() => expect(result.current.failure).not.toBeNull());

    act(() => result.current.retry({ fail: false }));
    await waitFor(() => expect(result.current.status).toBe("saved"));

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls).toHaveLength(2);
    expect(postCalls[1]?.[0]).toBe("/api/alerts");
    expect(JSON.parse(String(postCalls[1]?.[1]?.body))).toMatchObject({ threshold: 97 });
    expect(result.current.failure).toBeNull();
  });

  it("removes a row optimistically and brings it back when the delete fails", async () => {
    const { result } = setup((url, init) => {
      if (init?.method === "DELETE") return ok({ message: "Delete failed (simulated)" }, 500);
      return ok({ rules: [saved] });
    });
    await waitFor(() => expect(result.current.rules).toHaveLength(1));

    act(() => result.current.remove("r1"));
    await waitFor(() => expect(result.current.deleteFailed).toBe(true));
    expect(result.current.rules).toHaveLength(1);
  });
});

describe("browser storage", () => {
  it("persists a confirmed save and a delete", async () => {
    const { result } = setup((_url, init) =>
      init?.method === "POST"
        ? ok({ rule: { ...next, id: "new", createdAt: "2026-01-01T00:00:00.000Z" } })
        : Promise.resolve(new Response(null, { status: 204 })),
    );
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    act(() => result.current.save([next], { fail: false }));
    await waitFor(() => expect(result.current.status).toBe("saved"));
    // Same metric and scope: updated in place, id kept.
    expect(readRules()).toEqual([expect.objectContaining({ id: "r1", threshold: 97 })]);

    act(() => result.current.remove("r1"));
    await waitFor(() => expect(result.current.rules).toHaveLength(0));
    expect(readRules()).toEqual([]);
  });

  it("writes nothing when the save fails", async () => {
    const { result } = setup(() => ok({ message: "x" }, 500));
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    act(() => result.current.save([next], { fail: true }));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    expect(readRules()).toEqual([expect.objectContaining({ threshold: 95 })]);
  });

  it("falls back to an empty list on corrupt data and drops invalid entries", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(readRules()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 1 }));
    expect(readRules()).toEqual([]);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([saved, { ...saved, threshold: 500 }]));
    expect(readRules()).toEqual([saved]);
  });

  it("keeps rules in memory when localStorage throws", async () => {
    const { writeRules } = await import("@/features/alerts/storage");
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    writeRules([saved]);
    expect(readRules()).toEqual([saved]);
    spy.mockRestore();
    get.mockRestore();
  });

  it("refetches when another tab changes the rules", async () => {
    const { result } = setup(() => ok({}));
    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    });
    await waitFor(() => expect(result.current.rules).toHaveLength(0));
  });
});

describe("normalizeRules", () => {
  const rule = (metric: AlertRule["metric"], scope: AlertRule["scope"], id: string): AlertRule => ({
    id,
    metric,
    comparator: "below",
    threshold: 1,
    scope,
  });

  it("dedupes by metric and scope and orders the list the same way every time", async () => {
    const { normalizeRules } = await import("@/features/alerts/rules");
    const rows = [
      rule("attainment", { regionId: "eu" }, "a"),
      rule("attainment", "portfolio", "b"),
      rule("growth", { regionId: "eu" }, "c"),
      rule("growth", "portfolio", "d"),
      rule("growth", "portfolio", "e"),
    ];
    const order = (r: AlertRule[]) => r.map((x) => `${x.metric}:${JSON.stringify(x.scope)}`);
    const expected = order(normalizeRules(rows));
    expect(expected).toEqual([
      'growth:"portfolio"',
      'attainment:"portfolio"',
      'growth:{"regionId":"eu"}',
      'attainment:{"regionId":"eu"}',
    ]);
    expect(order(normalizeRules([...rows].reverse()))).toEqual(expected);
  });
});

describe("useAlertSave load failure", () => {
  it("reports a failed load instead of an empty list, and Retry reads again", async () => {
    let fail = true;
    const api = {
      listRules: vi.fn(() => (fail ? Promise.reject(new Error("500")) : Promise.resolve([saved]))),
      saveRule: vi.fn(),
      deleteRule: vi.fn(),
    };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAlertSave(api), { wrapper });
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.rules).toEqual([]);
    fail = false;
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.loadFailed).toBe(false));
    expect(result.current.rules).toHaveLength(1);
  });
});
