import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/?mode=analyst";

/** Clicks before hydration do nothing; wait for the page to settle first. */
async function open(page: Page, url = URL) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

test("the sheet reads toolbar, KPI strip, Markets, Map, revenue, Compare, heat map, Alerts", async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole("toolbar", { name: "Analyst controls" })).toBeVisible();
  const headings = await page.locator("main h3").evaluateAll((els) =>
    els.map(
      (e) =>
        e.textContent
          ?.trim()
          .split(/\s{2,}|·/)[0]
          ?.trim() ?? "",
    ),
  );
  const order = ["Markets", "Map", "Portfolio revenue", "Compare", "Attainment by month", "Alerts"];
  const found = order.map((name) => headings.findIndex((h) => h.startsWith(name)));
  expect(found.every((i) => i >= 0)).toBe(true);
  expect(found).toEqual([...found].sort((a, b) => a - b));
  await expect(page.getByRole("group", { name: "PORTFOLIO REVENUE" })).toContainText("$22.9M");
});

test("the period and product controls live in the toolbar, not the header", async ({ page }) => {
  await open(page);
  const toolbar = page.getByRole("toolbar", { name: "Analyst controls" });
  await expect(toolbar.getByRole("combobox", { name: "Period" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Period" })).toHaveCount(1);
  await expect(toolbar.getByRole("group", { name: /Product/ })).toBeVisible();
  await page.goto("/?mode=analyst&region=eu&market=de");
  await expect(toolbar.getByRole("combobox", { name: "Product" })).toBeEnabled();
  await page.goto("/");
  await expect(page.getByRole("combobox", { name: "Period" })).toBeVisible();
});

test("the grid has Forecast and Prior year columns and a Portfolio total row", async ({ page }) => {
  await open(page);
  const grid = page.getByRole("region", { name: /^Markets \d/ });
  const headers = await grid.locator("thead th").allTextContents();
  const clean = headers.map((h) => h.trim().toLowerCase());
  expect(clean.slice(0, 7)).toEqual([
    "market",
    "region",
    "status",
    "revenue",
    "forecast",
    "prior year",
    "attainment",
  ]);
  const total = grid.locator("tfoot tr");
  await expect(total).toContainText("Portfolio");
  for (const v of ["$22.9M", "$22.7M", "$21.3M", "100.4%", "+7.3%", "103,868"]) {
    await expect(total).toContainText(v);
  }
});

test("sorting by Prior year reorders the rows and says so", async ({ page }) => {
  await open(page);
  const grid = page.getByRole("region", { name: /^Markets \d/ });
  await grid.getByRole("button", { name: "Prior year" }).click();
  await expect(grid.getByRole("columnheader", { name: "Prior year" })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
  await expect(grid.locator("tbody tr").first()).toContainText("China");
  await expect(grid.getByText("Sorted by prior year").first()).toBeVisible();
  await grid.getByRole("button", { name: "Market" }).click();
  await expect(grid.locator("tbody tr").first()).toContainText("Australia");
});

test("the Region cell drills forward into the region", async ({ page }) => {
  await open(page);
  await page
    .getByRole("region", { name: /^Markets \d/ })
    .getByRole("button", { name: "Drill into Europe" })
    .first()
    .click();
  await expect(page).toHaveURL(/region=eu/);
  await expect(page.getByRole("region", { name: /^Markets · Europe \d/ })).toBeVisible();
});

test("the By region bars drill, and the sentence names Europe as the drag", async ({ page }) => {
  await open(page);
  await expect(page.getByText("Europe is the drag.")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "By region" })
      .getByRole("button", { name: /^Drill into Europe/ }),
  ).toContainText("95.4%");
  await page
    .getByRole("region", { name: "By region" })
    .getByRole("button", { name: /^Drill into APAC/ })
    .click();
  await expect(page).toHaveURL(/region=apac/);
});

test("Alerts are folded by default, open on activation and stay open for the tab", async ({
  page,
}) => {
  await open(page);
  const trigger = page.getByRole("button", { name: /^Alerts/ });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toContainText("No rules");
  await trigger.click();
  await expect(page.getByRole("textbox", { name: "Attainment below" })).toBeVisible();
  await page.reload();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
});

for (const theme of ["light", "dark"] as const) {
  test(`the ledger has no axe violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await open(page);
    await page.getByRole("gridcell").first().waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
