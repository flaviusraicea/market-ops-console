import { expect, test, type Page, type Route } from "@playwright/test";

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
  await expect(page.locator("#verdict-h")).not.toBeFocused();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing animates or transitions at any sampled frame", async ({ page }) => {
    await page.goto("/?mode=analyst&region=eu&market=de");
    await expect(page.locator('path[data-series="actual"]')).toBeVisible();

    // Sample every frame from now until the drill settles.
    await page.evaluate(() => {
      const seen = { animations: 0, transitions: new Set<string>() };
      Object.assign(window, { __motion: seen });
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

    const seen = await page.evaluate(() => {
      const { animations, transitions } = (
        window as unknown as { __motion: { animations: number; transitions: Set<string> } }
      ).__motion;
      return { animations, transitions: [...transitions] };
    });
    expect(seen).toEqual({ animations: 0, transitions: [] });
  });
});
