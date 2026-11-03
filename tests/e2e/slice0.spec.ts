import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("serves the shell", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Market Ops");
  await expect(page.getByText(/data through may 2026/i).locator("visible=true")).toBeVisible();
});

test("theme toggle sets data-theme and persists across reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.*/);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("analyst mode switches density", async ({ page }) => {
  await page.goto("/?mode=analyst");
  await expect(page.locator("html")).toHaveAttribute("data-density", "analyst");
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe finds no violations in ${scheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}
