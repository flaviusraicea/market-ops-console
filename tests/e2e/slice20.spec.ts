import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test, type Page } from "@playwright/test";

import { onChromium, open } from "./helpers";

const iPhone = onChromium(devices["iPhone 14"]!);
const iPad = onChromium(devices["iPad (gen 7)"]!);

const OVERVIEW = "/";
const ANALYST = "/?mode=analyst&region=eu&market=de";
// A drilled market adds the product select and the breadcrumb trail to the header: the widest header there is.
const DRILL = "/?region=eu&market=de";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa"];

const bar = (page: Page) => page.getByRole("button", { name: /^Ask the assistant/ });
const sheet = (page: Page) => page.getByRole("dialog", { name: "Assistant" });
const composer = (page: Page) => page.getByRole("textbox", { name: "Ask the assistant" });

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const [name, profile] of [
  ["iPhone 14", iPhone],
  ["iPad (gen 7)", iPad],
] as const) {
  test.describe(`${name}: nothing scrolls sideways`, () => {
    test.use(profile);
    for (const url of [OVERVIEW, DRILL, ANALYST]) {
      test(url, async ({ page }) => {
        await open(page, url);
        expect(await overflow(page)).toBeLessThanOrEqual(0);
      });
    }
  });
}

for (const [name, profile] of [
  ["iPhone 14", iPhone],
  ["iPad (gen 7)", iPad],
] as const) {
  test.describe(`${name}: KPI tile eyebrows are whole`, () => {
    test.use(profile);
    test("no eyebrow in a tile is clipped", async ({ page }) => {
      await open(page, OVERVIEW);
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-slot="kpi"] > p:first-child')]
          .filter((el) => el.offsetWidth > 0)
          .filter(
            (el) =>
              el.scrollWidth > el.clientWidth + 1 ||
              el.getBoundingClientRect().right >
                (el.closest('[data-slot="kpi"]') as HTMLElement).getBoundingClientRect().right,
          )
          .map((el) => el.textContent),
      );
      expect(clipped).toEqual([]);
    });
  });
}

test.describe("phone", () => {
  test.use(iPhone);

  test("a chart tooltip near the edge stays inside the screen", async ({ page }) => {
    await open(page, ANALYST);
    const marker = page.getByRole("button", { name: /^Anomaly: / }).first();
    await marker.focus();
    const tip = page.getByRole("tooltip").first();
    await expect(tip).toBeVisible();
    const box = (await tip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test("the header is two rows of 44 px: the account sits in row 1 and the period and mode switch in row 2", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    const box = async (l: ReturnType<Page["getByRole"]>) => (await l.boundingBox())!;
    const wordmark = await box(page.getByRole("heading", { name: "Market Ops" }));
    const theme = await box(page.getByRole("button", { name: /^Switch to (dark|light) theme$/ }));
    const avatar = await box(page.getByRole("button", { name: /^Signed in as/ }));
    const period = await box(page.getByRole("combobox", { name: "Period" }));
    const mode = await box(page.getByRole("radio", { name: "Analyst" }));
    expect(Math.abs(avatar.y - wordmark.y)).toBeLessThan(24);
    expect(Math.abs(theme.y - avatar.y)).toBeLessThan(4);
    expect(period.y).toBeGreaterThan(avatar.y + avatar.height - 1);
    expect(Math.abs(period.y - mode.y)).toBeLessThan(8);
    expect(period.height).toBeGreaterThanOrEqual(44);
    expect(avatar.height).toBeGreaterThanOrEqual(44);
    expect(avatar.x + avatar.width).toBeLessThanOrEqual(390);
  });

  test("the Overview carries the data stamp under its eyebrow, since the header drops it", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    await expect(page.getByText(/^Data through May 2026$/i).locator("visible=true")).toHaveCount(1);
  });

  test("the Analyst grid scrolls inside its own region and keeps its first column in view", async ({
    page,
  }) => {
    await open(page, ANALYST);
    const region = page.getByRole("region", { name: /scrollable$/ }).first();
    await expect(region).toHaveAttribute("tabindex", "0");
    const sizes = await region.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }));
    expect(sizes.sw).toBeGreaterThan(sizes.cw);
    await region.evaluate((el) => el.scrollBy(200, 0));
    const regionBox = (await region.boundingBox())!;
    const first = (await region
      .locator("tbody tr")
      .first()
      .locator("td, th")
      .first()
      .boundingBox())!;
    expect(first.x).toBeGreaterThanOrEqual(regionBox.x - 1);
    expect(first.x).toBeLessThan(regionBox.x + 40);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the heat map opens scrolled to the latest months", async ({ page }) => {
    await open(page, ANALYST);
    const grid = page.getByRole("grid", { name: /attainment/i }).first();
    const scrolled = await grid.evaluate((el) => {
      const scroller = el.parentElement!;
      return { left: scroller.scrollLeft, max: scroller.scrollWidth - scroller.clientWidth };
    });
    expect(scrolled.max).toBeGreaterThan(0);
    expect(scrolled.left).toBeGreaterThanOrEqual(scrolled.max - 1);
  });

  test("Analyst: the map section also starts as a table with a View map toggle", async ({
    page,
  }) => {
    await open(page, "/?mode=analyst");
    const toggle = page.getByRole("button", { name: "View map", exact: true });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.getByRole("button", { name: /^View as table/ }).first()).toBeVisible();
  });

  test("nothing scrolls sideways at 375 px on Overview, a drilled market and Analyst", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    for (const url of [OVERVIEW, DRILL, ANALYST]) {
      await open(page, url);
      expect(await overflow(page), url).toBeLessThanOrEqual(0);
    }
  });

  test("Overview: the map card shows the table first and the toggle reads View map", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    const toggle = page.getByRole("button", { name: "View map", exact: true });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("table", { name: /Markets/ })).toBeVisible();
    await toggle.click();
    await expect(page.getByRole("button", { name: /^View as table/ }).first()).toBeVisible();
    await expect(page.getByRole("table", { name: /Markets/ })).toBeHidden();
  });

  test("the bar opens the assistant sheet with the cursor in the composer; Escape returns focus to the bar", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    await expect(bar(page)).toBeVisible();
    await bar(page).tap();
    await expect(sheet(page)).toBeVisible();
    await expect(composer(page)).toBeFocused();
    await composer(page).fill("Why did Germany dip?");
    await composer(page).press("Enter");
    await expect(page.getByText("Why did Germany dip?").first()).toBeVisible();
    await expect(page.getByRole("list", { name: "Citations" })).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeHidden();
    await expect(bar(page)).toBeFocused();
  });

  test("a visible Close button closes the sheet and focus returns to the bar; the draft survives", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    await bar(page).tap();
    await composer(page).fill("What about Spain?");
    const close = sheet(page).getByRole("button", { name: "Close assistant" });
    expect(Math.round((await close.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
    await close.tap();
    await expect(sheet(page)).toBeHidden();
    await expect(bar(page)).toBeFocused();
    await bar(page).tap();
    await expect(composer(page)).toHaveValue("What about Spain?");
  });

  test("Ask why on a mover opens the sheet on its question, and does not raise the keyboard", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    await page.getByRole("button", { name: "Ask why Germany dipped" }).first().tap();
    await expect(sheet(page)).toBeVisible();
    await expect(
      sheet(page)
        .getByText(/Why did Germany/)
        .first(),
    ).toBeVisible();
    await expect(composer(page)).not.toBeFocused();
  });

  test("an answer that finishes while the sheet is closed shows on the bar", async ({ page }) => {
    await open(page, OVERVIEW);
    await bar(page).tap();
    await composer(page).fill("Why did Germany dip?");
    await composer(page).press("Enter");
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toBeHidden();
    await expect(bar(page)).toContainText("1 new answer", { timeout: 15_000 });
    await bar(page).tap();
    await expect(page.getByRole("list", { name: "Citations" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bar(page)).not.toContainText("new answer");
  });

  test("following a citation closes the sheet so the chart is in view", async ({ page }) => {
    await open(page, OVERVIEW);
    await bar(page).tap();
    await composer(page).fill("Why did Germany dip?");
    await composer(page).press("Enter");
    const chip = page.getByRole("list", { name: "Citations" }).getByRole("button").first();
    await chip.tap({ timeout: 15_000 });
    await expect(sheet(page)).toBeHidden();
    await expect(page).toHaveURL(/mode=analyst/);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the command palette opens from the bar by touch and Go to Germany works", async ({
    page,
  }) => {
    await open(page, OVERVIEW);
    await page.getByRole("button", { name: "Open command palette" }).tap();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await palette.getByRole("combobox").fill("germ");
    await palette.getByRole("option", { name: /Go to Germany/ }).tap();
    await expect(page).toHaveURL(/market=de/);
  });

  for (const [title, url] of [
    ["Overview", OVERVIEW],
    ["Analyst", ANALYST],
  ] as const) {
    test(`${title}: every button, link and field is at least 44 px (chips 36 px)`, async ({
      page,
    }) => {
      await open(page, url);
      const small = await page.evaluate(() => {
        const sel =
          'a[href], button, select, input:not([type="hidden"]), textarea, [role="button"], [role="radio"], [role="tab"]';
        return [...document.querySelectorAll<HTMLElement>(sel)]
          .filter((el) => !el.closest(".sr-only-focusable") && !el.closest("svg"))
          .map((el) => ({ el, box: el.getBoundingClientRect() }))
          .filter(({ box }) => box.width > 0 && box.height > 0)
          .filter(({ el, box }) => {
            const chip = el.hasAttribute("data-chip");
            // A small control may borrow its 44 px target from an ::after layer (data-hit).
            const hit = el.hasAttribute("data-hit") ? getComputedStyle(el, "::after") : null;
            const w = hit ? parseFloat(hit.width) : box.width;
            const h = hit ? parseFloat(hit.height) : box.height;
            return h < (chip ? 36 : 44) - 0.5 || w < (chip ? 36 : 44) - 0.5;
          })
          .map(
            ({ el, box }) =>
              `${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30)} ${Math.round(box.width)}x${Math.round(box.height)}`,
          );
      });
      expect(small).toEqual([]);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    for (const [title, url] of [
      ["Overview", OVERVIEW],
      ["Analyst", ANALYST],
    ] as const) {
      test(`axe: ${title}, ${scheme}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
        await open(page, url);
        expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
      });
    }
    test(`axe: the assistant sheet, ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await open(page, OVERVIEW);
      await bar(page).tap();
      await expect(sheet(page)).toBeVisible();
      expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    });
  }
});
