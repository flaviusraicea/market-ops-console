import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { ask, boxOf, open } from "./helpers";
import { TAB_ORDERS } from "./tabOrder";

const OVERVIEW = "/";
const ANALYST = "/?mode=analyst&region=eu&market=de";
const DRILL = "/?region=eu&market=de";
const THEMES = ["light", "dark"] as const;
const WIDTHS = [390, 768, 1024, 1280, 1440] as const;
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa"];

/** Resolves once every animation on the page has finished. */
const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)).then(() => true),
  );

const running = (page: Page) => page.evaluate(() => document.getAnimations().length);

test.describe("theme", () => {
  test("the toggle persists across a reload and the choice wins over the OS", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await open(page, OVERVIEW);
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    // The pre-paint script sets the attribute before hydration.
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      "rgb(15, 19, 24)",
    );
  });

  test("charts and chips re-colour on toggle without a reload (CSS variables only)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await open(page, OVERVIEW);
    const land = page.locator('path[fill="var(--map-land)"]').first();
    const fill = () => land.evaluate((el) => getComputedStyle(el).fill);
    const chip = page.getByRole("button", { name: "Germany, off track", exact: true });
    const chipBg = () => chip.evaluate((el) => getComputedStyle(el).backgroundColor);
    const [landLight, chipLight] = [await fill(), await chipBg()];
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect.poll(fill).not.toBe(landLight);
    await expect.poll(chipBg).not.toBe(chipLight);
    expect(await fill()).toBe("rgb(34, 42, 52)");
  });
});

test.describe("density", () => {
  for (const theme of THEMES) {
    test(`Overview is airy and Analyst is dense (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1440, height: 900 });
      const measure = (target: Locator, prop: "height" | "fontSize") =>
        target.first().evaluate((el, p) => parseFloat(getComputedStyle(el)[p]), prop);
      const px = (selector: string, prop: "height" | "fontSize") =>
        measure(page.locator(selector), prop);
      const headerRow = () => measure(page.locator('[data-slot="header-row"]'), "height");
      const token = (name: string) =>
        page.evaluate(
          (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
          name,
        );

      await open(page, OVERVIEW);
      expect(await headerRow()).toBe(56);
      expect(await px('[data-slot="kpi-headline"]', "fontSize")).toBe(28);
      expect(await px('[role="combobox"]', "height")).toBe(36);
      expect([await token("--row-h"), await token("--control-h")]).toEqual(["44px", "36px"]);

      await open(page, ANALYST);
      expect(await headerRow()).toBe(48);
      expect(await px('[role="toolbar"]', "height")).toBe(40);
      expect(await px('[role="combobox"]', "height")).toBe(28);
      expect(await px("tbody tr", "height")).toBe(32);
      expect([await token("--row-h"), await token("--control-h")]).toEqual(["32px", "28px"]);
    });
  }
});

test.describe("reduced motion", () => {
  test("nothing is left animating after a drill, or after opening and closing the palette", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, OVERVIEW);
    await page.getByRole("button", { name: "Drill into Europe" }).first().click();
    await expect(page).toHaveURL(/region=eu/);
    await settled(page);
    expect(await running(page)).toBe(0);

    await page.keyboard.press("Control+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await settled(page);
    expect(await running(page)).toBe(0);
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
    expect(await running(page)).toBe(0);
  });

  test("the console's own override stops transitions and enter animations too", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    // The user path: the palette's reduce-motion command.
    await page.keyboard.press("Control+k");
    await page
      .getByRole("dialog", { name: "Command palette" })
      .getByRole("combobox")
      .fill("reduce motion");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
    await settled(page);
    expect(await running(page)).toBe(0);
    const durations = await page.evaluate(() =>
      [document.body, ...document.querySelectorAll("button")].map(
        (el) => getComputedStyle(el).transitionDuration,
      ),
    );
    expect(new Set(durations)).toEqual(new Set(["0s"]));
  });
});

test.describe("axe, WCAG 2.1 AA", () => {
  for (const theme of THEMES) {
    test.describe(theme, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
        await page.setViewportSize({ width: 1440, height: 900 });
      });
      const scan = async (page: Page) =>
        expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

      test("Overview", async ({ page }) => {
        await open(page, OVERVIEW);
        await scan(page);
      });

      test("Overview with an open answer", async ({ page }) => {
        await open(page, OVERVIEW);
        await ask(page, "Why did Germany dip?");
        await expect(page.getByRole("img", { name: /^High confidence/ })).toBeVisible({
          timeout: 8000,
        });
        await scan(page);
      });

      test("Overview with the palette open", async ({ page }) => {
        await open(page, OVERVIEW);
        await page.keyboard.press("Control+k");
        await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
        await scan(page);
      });

      test("Analyst, Germany, rail collapsed", async ({ page }) => {
        await open(page, ANALYST);
        await scan(page);
      });

      test("Analyst, Germany, rail open", async ({ page }) => {
        await open(page, ANALYST);
        await page.getByRole("button", { name: "Open assistant" }).click();
        await expect(page.locator("#assistant-panel")).toBeVisible();
        await scan(page);
      });
    });
  }
});

test.describe("responsive", () => {
  for (const url of [OVERVIEW, DRILL, ANALYST]) {
    for (const width of WIDTHS) {
      test(`${url} has no horizontal scroll at ${width} px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await open(page, url);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }

  for (const width of [390, 768]) {
    test(`at ${width} px the assistant is a bottom bar, not a panel in the page`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, OVERVIEW);
      await expect(page.getByRole("button", { name: "Ask the assistant" })).toBeVisible();
      await expect(page.locator("#assistant-panel")).toHaveCount(0);
    });
  }
});

test.describe("keyboard", () => {
  const label = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return "";
      // textContent, not innerText: the CSS uppercase of eyebrows is not part of the name.
      // A table row has no name of its own: its cells, spaced.
      const cells =
        el instanceof HTMLTableRowElement ? [...el.cells].map((c) => c.textContent).join(" ") : "";
      const text =
        el.getAttribute("aria-label") ||
        cells ||
        el.textContent ||
        el.getAttribute("placeholder") ||
        "";
      return text.trim().replace(/\s+/g, " ").slice(0, 60);
    });

  for (const { title, url, stops } of TAB_ORDERS) {
    test(`Tab order on ${title}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await open(page, url);
      const seen: string[] = [];
      for (let i = 0; i < stops.length; i++) {
        await page.keyboard.press("Tab");
        seen.push(await label(page));
      }
      expect(seen).toEqual(stops);
      // One more Tab leaves the page (the browser chrome), not a trap and not a loop inside it.
      await page.keyboard.press("Tab");
      expect(await label(page)).toBe("");
    });
  }
});

test("the chart toggles on Analyst have distinct names that start with their visible label (WCAG 2.4.6, 2.5.3)", async ({
  page,
}) => {
  await open(page, ANALYST);
  const names = await page
    .getByRole("button", { name: /^View as (table|chart)/ })
    .evaluateAll((els) => els.map((el) => el.textContent?.trim().replace(/\s+/g, " ") ?? ""));
  expect(names.length).toBeGreaterThanOrEqual(4);
  expect(new Set(names).size).toBe(names.length);
});

test("a reader who scrolls up right after asking is not pulled back down (WCAG 2.2.2)", async ({
  page,
}) => {
  // Four streamed answers back to back.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 640 });
  await open(page, OVERVIEW);
  for (let i = 0; i < 3; i++) {
    await ask(page, "Give me a full summary");
    await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(i + 1, {
      timeout: 20_000,
    });
  }
  const region = page.getByRole("region", { name: "Conversation" });
  const box = await boxOf(region);
  await ask(page, "Give me a full summary");
  // Wheel input lands inside the 500 ms follow window of the smooth scroll to the new card.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -5000);
  await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBe(0);
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(4, { timeout: 20_000 });
  expect(await region.evaluate((el) => el.scrollTop)).toBe(0);
  await expect(page.getByRole("button", { name: "Scroll to newest answer" })).toBeVisible();
});
