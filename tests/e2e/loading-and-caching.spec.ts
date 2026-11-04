import { expect, test, type Page } from "@playwright/test";

import { open, trackShifts } from "./helpers";

// Turbopack names chunks by hash, so each lazy module is recognised by a string that only it contains.
const MARKERS = {
  alerts: "market-ops:alerts-open",
  lineChart: "chart-cursor",
  radarChart: "data-axis",
  heatMap: "cursor-pointer rounded-mark",
  commandPalette: "Go to a market, switch view",
  accountMenu: "Sign out",
  answerCard: "Show sources",
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

test("the account menu and the answer card load on first use, and the menu opens from the keyboard", async ({
  page,
}) => {
  const loaded = watchScripts(page);
  await open(page, "/");
  expect(await loaded()).toEqual([]);

  const avatar = page.getByRole("button", { name: /Account menu$/ });
  await avatar.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  // Opened from the keyboard, focus lands on the first item, as it did before the menu was lazy.
  await expect(page.getByRole("menuitemradio", { name: "Executive" })).toBeFocused();
  await expect.poll(loaded).toContain("accountMenu");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Account menu$/ })).toBeFocused();
  expect(await loaded()).not.toContain("answerCard");

  await page.getByRole("textbox", { name: "Ask the assistant" }).fill("Why is Germany off track?");
  await expect.poll(loaded).toContain("answerCard");
});

test("a chunk that fails to load shows an error with Retry, and the next try succeeds", async ({
  page,
}) => {
  await open(page, "/");
  // From here on every script request fails, as it would offline or after a deploy removed the old chunks.
  let offline = true;
  await page.route("**/_next/static/**/*.js", (route) =>
    offline ? route.abort() : route.continue(),
  );

  // The account menu: the button says why nothing opened, and the next activation tries again.
  const avatar = page.getByRole("button", { name: /Account menu$/ });
  await avatar.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#account-menu-error")).toHaveText(/could not load/);
  offline = false;
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.keyboard.press("Escape");

  // The answer card: the question stays on screen, the one failed card shows under it, and Retry puts the
  // question back in the composer and loads the card.
  offline = true;
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill("Why is Germany off track?");
  await box.press("Enter");
  const conversation = page.getByRole("region", { name: "Conversation" });
  await expect(conversation).toContainText("Why is Germany off track?");
  const failed = page
    .getByRole("alert")
    .filter({ hasText: "Request failed · nothing was answered" });
  await expect(failed).toBeVisible();
  offline = false;
  await failed.getByRole("button", { name: "Retry" }).click();
  await expect(box).toHaveValue("Why is Germany off track?");
  await expect(page.getByRole("button", { name: /Show sources/ }).first()).toBeVisible({
    timeout: 15_000,
  });
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
  expect(skeletonH).toBeDefined();
  expect(mapH).toBeCloseTo(skeletonH ?? 0, 0);
  await page.waitForLoadState("networkidle");
  expect(await shift()).toBeLessThan(0.01);
});

/**
 * The Analyst placeholders are measured against the sections they stand for: hold the Analyst chunks so the
 * placeholders are on screen after the switch, note their heights, release the chunks and compare each with its
 * section. A placeholder of the wrong height shifts the page on a mode switch, and on a direct link when the
 * server's stream lands across two frames. The pair of charts wraps a subtitle and a legend below 1366 px, so at
 * 1280 only the sections above the fold are compared.
 */
for (const [width, count] of [
  [1440, 8],
  [1280, 5],
] as const) {
  test(`each Analyst placeholder is the height of its section at ${width} wide`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "/");
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      await gate;
      await route.continue();
    });
    await page.getByRole("radio", { name: "Analyst" }).click();
    const sheet = page.locator('[style*="--reserve-grid"]');
    const placeholders = page.locator('[role="status"][aria-busy="true"]');
    await expect(placeholders).toHaveCount(8);
    // The assistant column tweens its width after the switch and the map placeholder follows the sheet's width,
    // so measure once the transition has ended (the placeholders' own shimmer runs for good and is not one).
    await expect
      .poll(() =>
        page.evaluate(
          () => document.getAnimations().filter((a) => a instanceof CSSTransition).length,
        ),
      )
      .toBe(0);
    const held = await placeholders.evaluateAll((els) =>
      els.map((el) => [el.textContent, el.getBoundingClientRect().height] as const),
    );

    release();
    await page.getByRole("gridcell").first().waitFor();
    await expect(placeholders).toHaveCount(0);
    const sections = await sheet.evaluateAll((sheets) => {
      const heights = (el: Element) => el.getBoundingClientRect().height;
      const [kpi, grid, map, series, pair, alerts] = Array.from(sheets[0]!.children);
      const toolbar = document.querySelector('[role="toolbar"]')!;
      return [toolbar, kpi, grid, map, series, ...Array.from(pair!.children), alerts].map((el) =>
        heights(el!),
      );
    });
    for (const [i, [label, height]] of held.slice(0, count).entries()) {
      expect(height, `${label} placeholder ${height} px, section ${sections[i]} px`).toBeCloseTo(
        sections[i]!,
        0,
      );
    }
  });
}

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
  expect(home.headers()["cache-control"]).toBe("private, no-cache");

  await page.goto("/");
  const preload = await page.locator('link[rel="preload"][as="fetch"]').getAttribute("href");
  expect(preload).toMatch(/^\/geo\/markets\.[0-9a-f]{10}\.json$/);
  expect(preload).not.toBeNull();
  const geo = await request.get(preload ?? "");
  expect(geo.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");

  const alerts = await request.get("/api/alerts");
  expect(alerts.headers()["cache-control"]).toBe("no-store");
});

test("an error report posted to /api/errors is accepted, a malformed one is not", async ({
  request,
}) => {
  const ok = await request.post("/api/errors", {
    data: {
      level: "error",
      source: "boundary",
      name: "TypeError",
      message: "boom",
      widget: "radar",
      at: new Date().toISOString(),
    },
  });
  expect(ok.status()).toBe(204);
  const unknownSource = await request.post("/api/errors", {
    data: { level: "error", source: "nope", name: "E", message: "x", at: "now" },
  });
  expect(unknownSource.status()).toBe(400);
  const bad = await request.post("/api/errors", { data: "not json" });
  expect(bad.status()).toBe(400);
});
