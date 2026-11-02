import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const EUROPE = "/?mode=analyst&region=eu";
const ANOMALY = "Anomaly: March 2026 revenue fell 27 percent versus February";

const card = (page: Page, name: RegExp | string) =>
  page.getByRole("region", { name, exact: typeof name === "string" });

test("the Europe grid has five rows in order with statuses, and the status tooltip explains the rule", async ({
  page,
}) => {
  await page.goto(EUROPE);
  const grid = card(page, "Markets · Europe");
  const rows = grid.locator("tbody tr");
  await expect(rows).toHaveCount(5);
  const names = ["United Kingdom", "Germany", "France", "Italy", "Spain"];
  const statuses = ["At risk", "Off track", "At risk", "At risk", "Off track"];
  for (const [i, name] of names.entries()) {
    await expect(rows.nth(i)).toContainText(name);
    await expect(rows.nth(i)).toContainText(statuses[i]!);
  }
  await grid.getByRole("button", { name: "How status is determined" }).hover();
  await expect(page.getByRole("tooltip").first()).toContainText("attainment is below about 92.5%");
});

test("Spain's attainment info icon explains why it is off track above plan", async ({ page }) => {
  await page.goto(EUROPE);
  await card(page, "Markets · Europe")
    .getByRole("button", { name: "Status note for Spain" })
    .focus();
  await expect(page.getByRole("tooltip").first()).toContainText(
    "Off track despite 104.5% attainment. The status rule is not documented in the data; growth is −4.6%.",
  );
});

test("activating the Germany row with Enter selects Germany and shows the March anomaly marker", async ({
  page,
}) => {
  await page.goto(EUROPE);
  const row = card(page, "Markets · Europe").getByRole("row", { name: /Germany/ });
  await row.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/market=de/);
  const series = card(page, /Germany · Revenue vs forecast/);
  await expect(series.getByRole("button", { name: ANOMALY })).toHaveCount(1);
  await expect(card(page, "Products · Germany").locator("tbody tr")).toHaveCount(5);
});

test("a heat map cell sets market and period, and the time series tooltip opens on Mar 2026", async ({
  page,
}) => {
  await page.goto(EUROPE);
  await page.getByRole("gridcell", { name: "Germany, Mar 2026, 92.2% of forecast" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/period=2026-03/);
  await expect(page).toHaveURL(/market=de/);
  const series = card(page, /Germany · Revenue vs forecast/);
  await series.getByRole("slider", { name: "Month" }).focus();
  await expect(series.getByRole("tooltip")).toContainText("Mar 2026");
  await expect(series.getByRole("tooltip")).toContainText("Actual$1.21M");
});

test("heat map rows follow the grid's revenue order", async ({ page }) => {
  await page.goto(EUROPE);
  const gridNames = await card(page, /Markets · Europe/)
    .locator("tbody tr")
    .evaluateAll((rows) => rows.map((r) => r.querySelector("th, td")?.textContent?.trim() ?? ""));
  const heatNames = await card(page, /Attainment by month/)
    .getByRole("rowheader")
    .allTextContents();
  // The grid card also holds a hidden by-name table; the first rows are the visible grid.
  const gridOrder = gridNames.slice(0, heatNames.length).map((n) => n.replace(/\s*[A-Z]{2}$/, ""));
  expect(heatNames.map((n) => n.trim())).toEqual(gridOrder);
});

test("ArrowRight on the heat map moves to the next month", async ({ page }) => {
  await page.goto("/?mode=analyst&region=eu&market=de&period=2026-03");
  await page.getByRole("gridcell", { name: "Germany, Mar 2026, 92.2% of forecast" }).focus();
  await page.keyboard.press("ArrowRight");
  const next = page.getByRole("gridcell", { name: "Germany, Apr 2026, 92.2% of forecast" });
  await expect(next).toBeFocused();
});

test("View as table works on the grid-less charts, then returns to the chart", async ({ page }) => {
  await page.goto("/?mode=analyst&region=eu&market=de");
  for (const name of [/Germany · Revenue vs forecast/, /compared/, /Attainment by month/]) {
    const c = card(page, name);
    await c.getByRole("button", { name: "View as table" }).click();
    await expect(c.getByRole("table")).toBeVisible();
    await expect(c.getByRole("button", { name: "View as chart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await c.getByRole("button", { name: "View as chart" }).click();
    await expect(c.getByRole("table")).toBeHidden();
  }
  // The map has its own table toggle.
  const map = card(page, /Markets by/);
  await map.getByRole("button", { name: "View as table" }).click();
  await expect(map.getByRole("table")).toBeVisible();
});

test("basis YTD changes the Europe attainment tile and the caption", async ({ page }) => {
  await page.goto(EUROPE);
  const tile = page.getByRole("group", { name: "FORECAST ATTAINMENT", exact: true });
  await expect(tile.locator('[data-slot="kpi-headline"]')).toHaveText("95.4%");
  await page.getByRole("radio", { name: "YTD" }).click();
  await expect(page).toHaveURL(/basis=ytd/);
  await expect(tile.locator('[data-slot="kpi-headline"]')).toHaveText("95.1%");
  await expect(page.getByText("May 2026 · YTD")).toBeVisible();
});

test("MAT is unavailable before twelve months and explains why", async ({ page }) => {
  await page.goto("/?mode=analyst&period=2025-04");
  const mat = page.getByRole("radio", { name: "MAT" });
  await expect(mat).toHaveAttribute("aria-disabled", "true");
  // Retry the focus until the page has hydrated and the tooltip handlers are attached.
  await expect(async () => {
    await mat.blur();
    await mat.focus();
    await expect(page.getByRole("tooltip").first()).toContainText("Needs 12 months of data", {
      timeout: 1000,
    });
  }).toPass();
  await page.goto("/?mode=analyst&period=2025-04&basis=mat");
  await expect(page.getByRole("radio", { name: "Month" })).toBeChecked();
  await expect(page.getByText("MAT unavailable, showing Month")).toBeVisible();
});

test("the radar has the three axes and the alert thresholds card follows the heat map", async ({
  page,
}) => {
  await page.goto(EUROPE);
  const radar = card(page, /compared/);
  for (const axis of ["Attainment", "Growth", "Share (given)"]) {
    await expect(radar.getByText(axis, { exact: true }).first()).toBeVisible();
  }
  const heat = await card(page, /Attainment by month/).boundingBox();
  const alerts = await card(page, "Alert thresholds").boundingBox();
  expect(alerts!.y).toBeGreaterThan(heat!.y + heat!.height - 1);
});

for (const theme of ["light", "dark"] as const) {
  test(`analyst mode has no axe violations (${theme}, Europe and Germany)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    for (const url of [EUROPE, `${EUROPE}&market=de`]) {
      await page.goto(url);
      await page.getByRole("gridcell").first().waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });
}
