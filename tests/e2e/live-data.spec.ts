import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { open } from "./helpers";

const ANALYST_DE = "/?mode=analyst&region=eu&market=de";
const TICK_MS = 5000;
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.use({ viewport: { width: 1440, height: 900 } });

const tile = (page: Page) =>
  page.getByRole("group", { name: "GERMANY REVENUE" }).locator('[data-slot="kpi-headline"]');
/** The grid's total row: with Germany selected it shows Germany itself, beneath its products. */
const gridTotal = (page: Page) => page.locator("tfoot tr").first();
const liveButton = (page: Page) =>
  page.getByRole("group", { name: "Live data" }).first().getByRole("button", { name: "Live" });
const pausedButton = (page: Page) =>
  page.getByRole("group", { name: "Live data" }).first().getByRole("button", { name: "Paused" });
const railToggle = (page: Page) => page.getByRole("button", { name: "Open assistant" });
const panel = (page: Page) => page.locator("#assistant-panel");
/** What is selected, by its label: a selected row's figures move with Live, but which row is selected must not. */
const selection = (page: Page) =>
  page.locator('[aria-selected="true"], [aria-current="true"]').evaluateAll((els) =>
    // A row button's name carries its figures after the first comma; only the name says what is selected.
    els.map((el) => (el.querySelector("th, td") ?? el).textContent?.trim().split(",")[0] ?? ""),
  );

/** Opens the page with the clock under the test's control, so every tick is one explicit step. */
async function openWithClock(page: Page, url = ANALYST_DE) {
  await page.clock.install();
  await open(page, url);
}

/** Runs the fake clock a tick at a time until `read` stops returning `before`. */
async function untilChanged(page: Page, read: () => Promise<string | null>, before: string | null) {
  await expect
    .poll(async () => {
      await page.clock.runFor(TICK_MS);
      return read();
    })
    .not.toBe(before);
}

test("Live moves Germany's figures in place and leaves the view alone", async ({ page }) => {
  await openWithClock(page);
  await railToggle(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(tile(page)).toHaveText("$1.68M");
  const gridBefore = await gridTotal(page).innerText();
  const picked = await selection(page);
  const urlBefore = page.url();

  await expect(liveButton(page)).toHaveAttribute("aria-pressed", "false");
  await liveButton(page).click();
  await expect(liveButton(page)).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/^Live · updated \d{2}:\d{2}:\d{2}$/)).toBeVisible();

  await untilChanged(page, () => tile(page).textContent(), "$1.68M");
  await expect(tile(page)).not.toHaveText("$1.68M");
  await expect.poll(() => gridTotal(page).innerText()).not.toBe(gridBefore);

  expect(page.url()).toBe(urlBefore);
  await expect(panel(page)).toBeVisible();
  expect(await selection(page)).toEqual(picked);
  await expect(page.getByText("Derived · live").first()).toBeAttached();
  await expect(page.getByText("Live data is simulated; answers use the saved data.")).toBeVisible();
});

test("Paused freezes the figures, and a reload returns to the saved data", async ({ page }) => {
  await openWithClock(page);
  await liveButton(page).click();
  await untilChanged(page, () => tile(page).textContent(), "$1.68M");

  await pausedButton(page).click();
  await expect(pausedButton(page)).toHaveAttribute("aria-pressed", "true");
  const frozen = await tile(page).textContent();
  const gridFrozen = await gridTotal(page).innerText();
  await page.clock.runFor(TICK_MS * 6);
  await expect(tile(page)).toHaveText(frozen ?? "");
  expect(await gridTotal(page).innerText()).toBe(gridFrozen);
  await expect(page.getByText(/^Paused · simulated \d{2}:\d{2}:\d{2}$/)).toBeVisible();

  await page.reload();
  await page.getByRole("main").waitFor();
  await expect(tile(page)).toHaveText("$1.68M");
  await expect(page.getByText("Data through May 2026")).toBeVisible();
});

test("a hidden tab does not tick", async ({ page }) => {
  await openWithClock(page);
  await liveButton(page).click();
  await untilChanged(page, () => tile(page).textContent(), "$1.68M");
  const shown = await tile(page).textContent();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  });
  await page.clock.runFor(TICK_MS * 4);
  await expect(tile(page)).toHaveText(shown ?? "");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the dot is static and no mark transitions while values swap", async ({ page }) => {
    await openWithClock(page);
    await liveButton(page).click();
    await untilChanged(page, () => tile(page).textContent(), "$1.68M");
    const motion = await page.evaluate(() => {
      const dot = document.querySelector('[data-slot="live-dot"]');
      const fill = document.querySelector('[data-slot="dashboard"] .tween-fill');
      return {
        dotAnimation: dot ? getComputedStyle(dot).animationName : "missing",
        fillTransition: fill ? getComputedStyle(fill).transitionDuration : "missing",
      };
    });
    expect(motion.dotAnimation).toBe("none");
    expect(motion.fillTransition).toMatch(/^0(\.0+)?m?s(, 0(\.0+)?m?s)*$/);
  });
});

test.describe("axe, WCAG 2.1 AA, while live", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`Analyst, ${theme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await openWithClock(page);
      await liveButton(page).click();
      await untilChanged(page, () => tile(page).textContent(), "$1.68M");
      expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    });
  }

  test("Overview", async ({ page }) => {
    await openWithClock(page, "/");
    await liveButton(page).click();
    const headline = () =>
      page
        .getByRole("group", { name: "PORTFOLIO REVENUE" })
        .locator('[data-slot="kpi-headline"]')
        .textContent();
    await untilChanged(page, headline, await headline());
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
  });
});

test("an earlier month keeps its saved captions, while the heat map that spans the latest month says live", async ({
  page,
}) => {
  await openWithClock(page, "/?mode=analyst&period=2026-03");
  await liveButton(page).click();
  const heat = () =>
    page
      .getByText(/^Sorted by revenue · Derived/)
      .first()
      .textContent();
  await untilChanged(page, heat, await heat());
  await expect(page.getByText(/^Sorted by revenue · Derived · live/)).toBeVisible();
  await expect(page.getByText("Derived · sum of series").first()).toBeVisible();
});
