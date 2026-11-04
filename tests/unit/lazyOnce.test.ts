import { describe, expect, it, vi } from "vitest";

import { lazyOnce } from "@/lib/lazyOnce";

describe("lazyOnce", () => {
  it("runs the loader once and hands every caller the same promise", async () => {
    const loader = vi.fn(() => Promise.resolve("geo"));
    const lazy = lazyOnce(loader);
    expect(lazy.peek()).toBeUndefined();
    const first = lazy.load();
    expect(lazy.load()).toBe(first);
    await expect(first).resolves.toBe("geo");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(lazy.peek()).toBe("geo");
    await lazy.load();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("forgets a failed load, so the next call tries again", async () => {
    const loader = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("menu");
    const lazy = lazyOnce(loader);
    await expect(lazy.load()).rejects.toThrow("offline");
    expect(lazy.peek()).toBeUndefined();
    await expect(lazy.load()).resolves.toBe("menu");
    expect(loader).toHaveBeenCalledTimes(2);
    expect(lazy.peek()).toBe("menu");
  });
});
