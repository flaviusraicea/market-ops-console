import { expect, test, type Page, type Route } from "@playwright/test";

import { open } from "./helpers";

type MotionLog = { animations: number; transitions: Set<string> };
declare global {
  interface Window {
    __motion?: MotionLog;
  }
}

const dashboard = (page: Page) => page.getByRole("region", { name: "Dashboard" });
const opacity = (page: Page) =>
  dashboard(page).evaluate((el) => Number(getComputedStyle(el).opacity));

test("the dashboard column dims while a drill is in flight and settles back to full", async ({
  page,
}) => {
  await page.goto("/");
  await expect(dashboard(page)).toHaveAttribute("data-pending", "false");

  // Hold the server render of the drill until the test has seen the dimmed state.
  const held: Route[] = [];
  let holding = true;
  await page.route(/[?&]market=de/, (route) =>
    holding ? void held.push(route) : route.continue(),
  );
  await page
    .getByRole("group", { name: "Market status by region" })
    .getByRole("button", { name: "Germany, off track" })
    .click();

  await expect(dashboard(page)).toHaveAttribute("data-pending", "true");
  await expect.poll(() => opacity(page)).toBeLessThan(1);

  holding = false;
  await Promise.all(held.map((route) => route.continue()));
  await expect(dashboard(page)).toHaveAttribute("data-pending", "false");
  await expect.poll(() => opacity(page)).toBe(1);
});

test("a heat-map click selects the cell at once and dims only once the server is slow", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&region=eu&market=de&period=2026-05");
  const held: Route[] = [];
  let holding = true;
  await page.route(/[?&]period=2026-01/, (route) =>
    holding ? void held.push(route) : route.continue(),
  );
  const cell = page.locator('[data-market="de"][data-period="2026-01"]');
  const clickedAt = Date.now();
  await cell.click();
  // The cell is selected before the server answers, and a quick response would never flash the dim.
  await expect(cell).toHaveAttribute("aria-selected", "true");
  const early = await dashboard(page).getAttribute("data-pending");
  if (Date.now() - clickedAt < 200) expect(early).toBe("false");
  await expect(dashboard(page)).toHaveAttribute("data-pending", "true");
  expect(Date.now() - clickedAt).toBeGreaterThanOrEqual(250);

  holding = false;
  await Promise.all(held.map((route) => route.continue()));
  await expect(dashboard(page)).toHaveAttribute("data-pending", "false");
  await expect(cell).toHaveAttribute("aria-selected", "true");
});

test("a keyboard drill moves focus to the new page heading, a mouse drill leaves it alone", async ({
  page,
}) => {
  await page.goto("/");
  const chip = () =>
    page
      .getByRole("group", { name: "Market status by region" })
      .getByRole("button", { name: "Germany, off track" });
  await chip().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/market=de/);
  await expect(page.locator("#verdict-h")).toBeFocused();

  await page.goto("/");
  await chip().click();
  await expect(page).toHaveURL(/market=de/);
  await expect(dashboard(page)).toHaveAttribute("data-pending", "false");
  await expect(page.locator("#verdict-h")).not.toBeFocused();
});

test("the drill link in a grid row keeps a visible focus ring, and the row itself is not a tab stop", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&region=eu&market=de");
  const row = page.locator("tr[data-landing-target]").first();
  await expect(row).not.toHaveAttribute("tabindex");
  const target = row.getByRole("link");
  await target.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(target).toBeFocused();
  const ring = await target.evaluate((el) => {
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(el);
    return { outlineStyle, outlineWidth, outlineColor };
  });
  expect(ring.outlineStyle).toBe("solid");
  expect(ring.outlineWidth).toBe("2px");
  expect(ring.outlineColor).not.toBe("rgba(0, 0, 0, 0)");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing animates or transitions at any sampled frame", async ({ page }) => {
    await open(page, "/?mode=analyst&region=eu&market=de");
    await expect(page.locator('path[data-series="actual"]')).toBeVisible();

    // Sample every frame from now until the drill settles.
    await page.evaluate(() => {
      const seen: MotionLog = { animations: 0, transitions: new Set<string>() };
      window.__motion = seen;
      const selectors = [
        '[data-slot="dashboard"]',
        'path[data-series="actual"]',
        '[role="gridcell"]',
        "[data-landing-target]",
      ];
      const sample = () => {
        seen.animations = Math.max(seen.animations, document.getAnimations().length);
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (!el) continue;
          const { transitionDuration } = getComputedStyle(el);
          if (transitionDuration.split(",").some((d) => parseFloat(d) !== 0)) {
            seen.transitions.add(`${sel}: ${transitionDuration}`);
          }
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await page.getByRole("radio", { name: "MAT" }).click();
    await expect(page).toHaveURL(/basis=mat/);
    await expect(dashboard(page)).toHaveAttribute("data-pending", "false");

    const seen = await page.evaluate(() => ({
      animations: window.__motion?.animations,
      transitions: [...(window.__motion?.transitions ?? [])],
    }));
    expect(seen).toEqual({ animations: 0, transitions: [] });
  });
});
