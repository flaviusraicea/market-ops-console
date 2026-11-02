import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function tabThrough(page: Page, names: { role: string; name: string }[]) {
  for (const { role, name } of names) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus-visible");
    await expect(focused).toHaveAccessibleName(name);
    const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  }
}

test("cold open content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Market Ops");
  await expect(page.getByText(/data through may 2026/i)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Overview" })).toBeChecked();
  for (const name of [
    "Which markets are at risk?",
    "Why did Germany dip?",
    "What will sales be next year?",
  ]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
});

test("tab order at the latest period skips the wordmark and has no period chip", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Clear period" })).toHaveCount(0);
  await tabThrough(page, [
    { role: "link", name: "Skip to content" },
    { role: "combobox", name: "Period" },
    { role: "radio", name: "Overview" },
    { role: "button", name: "Switch to dark theme" },
  ]);
});

test("tab order on a drilled earlier period", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/?period=2026-03&market=de");
  await tabThrough(page, [
    { role: "link", name: "Skip to content" },
    { role: "button", name: "Portfolio" },
    { role: "button", name: "Europe" },
    { role: "button", name: "Clear period" },
    { role: "combobox", name: "Period" },
    { role: "radio", name: "Overview" },
    { role: "button", name: "Switch to dark theme" },
  ]);
});

test("assistant stacks below the dashboard at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = await page.locator('section[aria-labelledby="dashboard-h"]').boundingBox();
  const aside = await page.locator('aside[aria-labelledby="assistant-h"]').boundingBox();
  expect(aside!.y).toBeGreaterThanOrEqual(section!.y + section!.height);
});

test("OS dark preference with no storage uses the dark tokens", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(22, 21, 18)");
  await context.close();
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe finds no violations on / in ${scheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Why did Germany dip?" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}
