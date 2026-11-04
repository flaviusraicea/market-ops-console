import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { open } from "./helpers";

test("All facts opens under the Markets grid, scoped to the Context, and the URL carries it", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&region=eu&market=de");
  const toggle = page.getByRole("button", { name: "All facts" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(page).toHaveURL(/facts=1/);
  await expect(page.getByRole("button", { name: "Hide facts" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  const table = page.getByRole("table", { name: "120 of 1,560 facts" });
  await expect(table).toBeVisible();
  // Only the rows near the viewport are in the DOM.
  expect(await table.locator("tbody tr").count()).toBeLessThan(40);
  await expect(table).toHaveAttribute("aria-rowcount", "121");

  await page.getByRole("button", { name: "Hide facts" }).click();
  await expect(page).not.toHaveURL(/facts=1/);
  await expect(table).toHaveCount(0);
});

test("a facts=1 link opens the portfolio table, sorts, and passes axe", async ({ page }) => {
  await open(page, "/?mode=analyst&facts=1");
  const table = page.getByRole("table", { name: "1,560 of 1,560 facts" });
  await expect(table).toBeVisible();
  const attainment = table.getByRole("button", { name: /^attainment$/i });
  await attainment.click();
  await attainment.click();
  await expect(attainment.locator("xpath=ancestor::th")).toHaveAttribute("aria-sort", "descending");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
