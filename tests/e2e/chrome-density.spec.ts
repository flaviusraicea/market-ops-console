import { expect, test, type Locator, type Page } from "@playwright/test";

import { open } from "./helpers";

/**
 * Density is for the data surface. The chrome around it (header, toolbar card, assistant panel, command palette and
 * the menus those controls open) carries `data-chrome` and keeps the Executive scale, so no control changes size when
 * the audience changes. Measured at the two desktop widths the layout is tuned for, in both modes.
 */
type Sizes = Record<string, number>;

/** A rendered height in whole pixels: layout rounding is noise here, a density leak is 2 px or more. */
const heightOf = (target: Locator) =>
  target.evaluate((el) => Math.round(el.getBoundingClientRect().height));
const height = (page: Page, selector: string) => heightOf(page.locator(selector).first());

async function openPanel(page: Page) {
  const panel = page.locator("[data-panel]");
  if ((await panel.getAttribute("data-panel")) !== "open") {
    await page.getByRole("button", { name: "Open assistant" }).click();
  }
  await expect(panel).toHaveAttribute("data-panel", "open");
  await expect(page.locator("#assistant-panel")).toBeVisible();
}

async function chromeSizes(page: Page, mode: "executive" | "analyst"): Promise<Sizes> {
  await open(page, `/?mode=${mode}`);
  const sizes: Sizes = {};
  sizes.live = await height(page, "[aria-label='Live data'] button");
  sizes.view = await height(page, "[aria-label='View'] [role='radio']");
  sizes.search = await height(page, "button[aria-label='Search and commands']");
  sizes.theme = await height(page, "button[aria-label^='Switch to']");
  sizes.avatar = await height(page, "button[aria-label$='Account menu']");
  sizes.period = await height(page, "[data-slot='page-toolbar'] button[aria-label='Period']");
  sizes.product = await height(page, "[data-slot='page-toolbar'] button[aria-label='Product']");
  sizes.toolbarText = await page
    .locator("[data-slot='page-toolbar'] button[aria-label='Period']")
    .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));

  await openPanel(page);
  sizes.composer = await height(page, "#assistant-panel textarea");
  sizes.send = await height(page, "#assistant-panel button[aria-label='Send']");

  await page.locator("[data-slot='page-toolbar'] button[aria-label='Period']").click();
  const option = page.getByRole("option").first();
  await expect(option).toBeVisible();
  sizes.periodOption = await heightOf(option);
  await page.keyboard.press("Escape");

  await page.locator("button[aria-label$='Account menu']").click();
  const item = page.getByRole("menuitem").first();
  await expect(item).toBeVisible();
  sizes.menuItem = await heightOf(item);
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  // The dialog scales in; measure it at rest.
  await palette.evaluate((el) =>
    Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)),
  );
  sizes.paletteInput = await heightOf(palette.getByRole("combobox"));
  sizes.paletteOption = await heightOf(palette.getByRole("option").first());
  await page.keyboard.press("Escape");
  return sizes;
}

for (const width of [1440, 1024]) {
  test(`at ${width} px no chrome control changes size between Executive and Analyst`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const executive = await chromeSizes(page, "executive");
    const analyst = await chromeSizes(page, "analyst");
    expect(analyst).toEqual(executive);
    // The pinned scale itself: a 36 px control, a 32 px button in a 36 px track, the panel's 32 px composer row.
    expect(executive.period).toBe(36);
    expect(executive.live).toBe(32);
    expect(executive.view).toBe(32);
    expect(executive.composer).toBe(32);
    expect(executive.send).toBe(32);
    expect(executive.toolbarText).toBe(14);
  });
}
