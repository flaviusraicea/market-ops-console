import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlertRule } from "@/domain";
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

function setup(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(handler);
  vi.stubGlobal("fetch", fetchMock);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { fetchMock, ...renderHook(() => useAlertSave(), { wrapper }) };
}

beforeEach(() => vi.useRealTimers());
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
