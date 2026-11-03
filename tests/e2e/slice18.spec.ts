import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const palette = (page: Page) => page.getByRole("dialog", { name: "Command palette" });
const input = (page: Page) => palette(page).getByRole("combobox");
const opener = (page: Page) => page.getByRole("button", { name: "Open command palette" });

test("Ctrl+K focuses the palette input; germ + Enter drills to Germany and focus lands on the verdict", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(input(page)).toBeFocused();

  await input(page).fill("germ");
  await expect(palette(page).getByRole("option")).toHaveText([
    /Go to Germany/,
    /Ask: Why did Germany dip\?/,
  ]);
  await page.keyboard.press("Enter");

  await expect(palette(page)).toBeHidden();
  await expect(page).toHaveURL(/market=de/);
  await expect(page.locator("#verdict-h")).toBeFocused();
});

test("the assistant header button opens it, and Escape returns focus to the button", async ({
  page,
}) => {
  await page.goto("/?mode=analyst");
  await opener(page).click();
  await expect(input(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(palette(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

test("the rail icon on Analyst opens it, and Escape returns focus to the icon", async ({
  page,
}) => {
  await page.goto("/?mode=analyst");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("#assistant-panel")).toBeHidden();
  await opener(page).click();
  await expect(input(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(palette(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

test("Ask: Which markets are at risk? sends the question and focuses the composer", async ({
  page,
}) => {
  await page.goto("/");
  await opener(page).click();
  await palette(page)
    .getByRole("option", { name: /Ask: Which markets are at risk\?/ })
    .click();
  await expect(palette(page)).toBeHidden();
  await expect(page.locator('[data-slot="chip-area"]')).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("textbox", { name: "Ask the assistant" })).toBeFocused();
});

test("views, products and theme commands", async ({ page }) => {
  await page.goto("/?market=de");
  await page.keyboard.press("Control+k");
  await expect(palette(page).getByRole("group", { name: /^Products/ })).toBeVisible();
  await input(page).fill("analyst");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/mode=analyst/);

  await page.keyboard.press("Control+k");
  await input(page).fill("toggle theme");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.keyboard.press("Control+k");
  await input(page).fill("reduce motion");
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-reduced-motion", "true");
});

test("Ctrl+K inside the palette keeps the real opener for Escape", async ({ page }) => {
  await page.goto("/");
  await opener(page).click();
  await expect(input(page)).toBeFocused();
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await expect(opener(page)).toBeFocused();
});

test("an unmatched query offers to ask it", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await input(page).fill("qzxw");
  await expect(palette(page).getByRole("option")).toHaveText([/Ask: "qzxw"/]);
});

test("axe is clean with the palette open", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(input(page)).toBeFocused();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("opens as a full-height sheet and Go to Germany works", async ({ page }) => {
    await page.goto("/");
    // Dispatched, not clicked: below 1024 px the map still overflows the page until slice 20.
    await opener(page).dispatchEvent("click");
    const box = await palette(page).boundingBox();
    expect(box?.x).toBe(0);
    expect(box?.y).toBe(0);
    expect(box?.width).toBe(390);
    expect(Math.round(box?.height ?? 0)).toBe(844);
    await input(page).fill("germ");
    await palette(page)
      .getByRole("option", { name: /Go to Germany/ })
      .click();
    await expect(page).toHaveURL(/market=de/);
  });
});
