import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/?mode=analyst";

/** Clicks before hydration do nothing; wait for the page to settle first. */
async function open(page: Page, url = URL) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.getByRole("main").waitFor();
  if (url.includes("analyst")) await page.getByRole("gridcell").first().waitFor();
}

const toggle = (page: Page) => page.getByRole("button", { name: /^(Open|Close) assistant$/ });
const composer = (page: Page) => page.getByRole("textbox", { name: "Ask the assistant" });

test.use({ viewport: { width: 1440, height: 900 } });

test("Analyst opens with the rail collapsed and a wide dashboard", async ({ page }) => {
  await open(page);
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#assistant-panel")).toBeHidden();
  const box = await page.getByRole("region", { name: "Dashboard" }).boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(1100);
});

test("the rail toggle opens the panel on its heading; Escape collapses and returns focus", async ({
  page,
}) => {
  await open(page);
  await toggle(page).click();
  await expect(page.locator("#assistant-panel")).toBeVisible();
  await expect(page.locator("#assistant-h")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#assistant-panel")).toBeHidden();
  await expect(toggle(page)).toBeFocused();
  await page.reload();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
});

test("Overview keeps the panel open and remembers each mode on its own", async ({ page }) => {
  await open(page, "/");
  await expect(page.locator("#assistant-panel")).toBeVisible();
  await page.getByRole("button", { name: "Collapse assistant" }).click();
  await expect(page.locator("#assistant-panel")).toBeHidden();
  await page.goto("/?mode=analyst");
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await page.goto("/");
  await expect(toggle(page)).toBeVisible();
});

test("Ask why on the Germany row opens the panel, sends, and echoes where it was asked", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("button", { name: "Ask why Germany dipped" }).click();
  await expect(page.locator("#assistant-panel")).toBeVisible();
  await expect(composer(page)).toBeFocused();
  await expect(page.getByText("You asked, about Germany · May 2026:")).toBeVisible();
  await expect(page.getByText("Answer complete", { exact: true })).toBeAttached({
    timeout: 15_000,
  });
});

test("Shift+Enter on a heat map cell fills the composer, sends nothing, then Enter sends it", async ({
  page,
}) => {
  await open(page);
  await page.getByRole("gridcell", { name: /^Germany, Mar 2026/ }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Ask about Germany, Mar 2026");
  await page.keyboard.press("Shift+Enter");
  await expect(composer(page)).toBeFocused();
  await expect(composer(page)).toHaveValue("Why did Germany's revenue dip in Mar 2026?");
  await expect(page.getByText("Germany · Mar 2026").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear context Germany · Mar 2026" }),
  ).toBeVisible();
  await expect(
    page.getByText("Filled from the heat map cell. Edit, then press Enter."),
  ).toBeVisible();
  await expect(page.getByText("You asked")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.getByText("You asked, about Germany · Mar 2026:")).toBeVisible();
});

test("the cell tooltip stays open while the pointer travels to its action", async ({ page }) => {
  await open(page);
  const cell = page.getByRole("gridcell", { name: /^Germany, Apr 2026/ });
  await cell.hover();
  const action = page.getByRole("button", { name: "Ask about Germany, Apr 2026" });
  await action.hover();
  await action.click();
  await expect(composer(page)).toHaveValue("Why did Germany's revenue change in Apr 2026?");
});

test("a collapsed panel keeps streaming and badges the finished answer", async ({ page }) => {
  await open(page);
  await toggle(page).click();
  await composer(page).fill("Why did Germany dip?");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("img", { name: "1 new answer" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("status")).toHaveText("Answer complete");
  await toggle(page).click();
  await expect(page.getByRole("img", { name: "1 new answer" })).toHaveCount(0);
});

test("between 1024 and 1279 px the open panel overlays with a scrim that closes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await open(page);
  await toggle(page).click();
  const panel = page.locator("#assistant-panel");
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("role", "dialog");
  await page.mouse.click(100, 400);
  await expect(panel).toBeHidden();
});

test("below 1024 px there is no rail and the panel sits under the dashboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(toggle(page)).toBeHidden();
  await expect(page.locator("#assistant-panel")).toBeVisible();
  await expect(page.getByRole("button", { name: "Collapse assistant" })).toBeHidden();
});

for (const theme of ["light", "dark"] as const) {
  for (const state of ["collapsed", "open"] as const) {
    test(`Analyst has no axe violations (${theme}, ${state})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await open(page);
      if (state === "open") await toggle(page).click();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
