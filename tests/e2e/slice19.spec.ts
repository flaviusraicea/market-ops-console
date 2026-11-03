import { expect, test, type Page } from "@playwright/test";

import { open } from "./helpers";

// Turbopack names chunks by hash, so each lazy module is recognised by a string that only it contains.
const MARKERS = {
  alerts: "market-ops:alerts-open",
  lineChart: "chart-cursor",
  radarChart: "data-axis",
  heatMap: "cursor-pointer rounded-[2px]",
  commandPalette: "Go to a market, switch view",
} as const;
type Marker = keyof typeof MARKERS;

/** Records the body of every script the page loads, so a test can ask which modules have arrived. */
function watchScripts(page: Page) {
  const bodies: Promise<string>[] = [];
  page.on("response", (res) => {
    if (res.url().includes("/_next/static/") && res.url().endsWith(".js"))
      bodies.push(res.text().catch(() => ""));
  });
  return async (): Promise<Marker[]> => {
    const texts = await Promise.all(bodies);
    return (Object.keys(MARKERS) as Marker[]).filter((k) =>
      texts.some((t) => t.includes(MARKERS[k])),
    );
  };
}

/** Sums layout-shift entries (without recent input) from before the first paint. */
async function trackShifts(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __shift: number };
    w.__shift = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>)
        if (!e.hadRecentInput) w.__shift += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  return () => page.evaluate(() => (window as unknown as { __shift: number }).__shift);
}

test("Overview downloads none of the Analyst code or the palette until they are asked for", async ({
  page,
}) => {
  const loaded = watchScripts(page);
  await open(page, "/");
  await expect(page.getByRole("button", { name: /Germany/ }).first()).toBeVisible();
  expect(await loaded()).toEqual([]);

  await page.getByRole("radio", { name: "Analyst" }).click();
  await expect(page).toHaveURL(/mode=analyst/);
  await expect
    .poll(loaded)
    .toEqual(expect.arrayContaining(["alerts", "lineChart", "radarChart", "heatMap"]));
  expect(await loaded()).not.toContain("commandPalette");

  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(loaded).toContain("commandPalette");
});

test("the map swaps in for a skeleton of the same height and nothing shifts", async ({ page }) => {
  const shift = await trackShifts(page);
  // Slow the geometry so the skeleton is on screen before the map replaces it.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/geo/markets.*.json", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("main").waitFor();
  const card = page.getByRole("region", { name: /Markets by/ });
  const skeletonH = (await card.locator('[data-slot="skeleton"]').boundingBox())?.height;
  expect(skeletonH).toBeGreaterThan(0);

  release();
  const map = card.getByRole("group", { name: /Markets by status/ });
  await expect(map).toBeVisible();
  const mapH = (await map.boundingBox())?.height;
  expect(mapH).toBeCloseTo(skeletonH!, 0);
  await page.waitForLoadState("networkidle");
  expect(await shift()).toBeLessThan(0.01);
});

test("an Analyst link paints without layout shift", async ({ page }) => {
  const shift = await trackShifts(page);
  await open(page, "/?mode=analyst&region=eu&market=de&product=veltrix&period=2026-03");
  expect(await shift()).toBeLessThan(0.01);
});

test("the page revalidates, the geometry is cached for good, and API responses are never stored", async ({
  request,
  page,
}) => {
  const home = await request.get("/");
  expect(home.headers()["cache-control"]).toBe("public, max-age=0, must-revalidate");

  await page.goto("/");
  const preload = await page.locator('link[rel="preload"][as="fetch"]').getAttribute("href");
  expect(preload).toMatch(/^\/geo\/markets\.[0-9a-f]{10}\.json$/);
  const geo = await request.get(preload!);
  expect(geo.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");

  const alerts = await request.get("/api/alerts");
  expect(alerts.headers()["cache-control"]).toBe("no-store");
});

test("an error report posted to /api/errors is accepted, a malformed one is not", async ({
  request,
}) => {
  const ok = await request.post("/api/errors", {
    data: { source: "boundary", name: "TypeError", message: "boom", widget: "radar" },
  });
  expect(ok.status()).toBe(204);
  const bad = await request.post("/api/errors", { data: "not json" });
  expect(bad.status()).toBe(400);
});
