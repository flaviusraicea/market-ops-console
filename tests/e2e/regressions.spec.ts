import { expect, test, type Page } from "@playwright/test";

import { open } from "./helpers";

const germanyOnMap = (page: Page) =>
  page
    .getByRole("region", { name: /^Markets by status/ })
    .locator('[aria-label^="Germany, "]')
    .first();

test("the map loads when a phone-width page is widened", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/");
  // The phone shows the table first, so the geometry is not drawn yet.
  await expect(germanyOnMap(page)).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(germanyOnMap(page)).toBeVisible();
});

test("drilling into another region from a market clears the market", async ({ page }) => {
  await open(page, "/?region=eu&market=de");
  await page
    .getByRole("region", { name: "By region" })
    .getByRole("button", { name: "Drill into APAC" })
    .click();
  await expect(page).toHaveURL(/region=apac/);
  await expect(page).not.toHaveURL(/market=/);
});

test("a sort chosen on markets does not carry over to the products of a market", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&region=eu");
  const grid = page.getByRole("region", { name: /^Markets/ });
  await grid.getByRole("button", { name: "Share" }).click();
  await expect(grid.getByText(/Sorted by share/).first()).toBeVisible();
  await grid.getByRole("row", { name: /Germany/ }).click();
  await expect(page).toHaveURL(/market=de/);
  await expect(page.getByText(/Sorted by share/)).toHaveCount(0);
});
