import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TILES = [
  { label: "PORTFOLIO REVENUE", headline: "$22.85M", delta: "+7.3% vs May 2025" },
  { label: "FORECAST ATTAINMENT", headline: "100.4%", delta: "+$0.10M vs forecast" },
  { label: "GROWTH, YEAR ON YEAR", headline: "+7.3%", delta: "YTD +6.1% vs 2025" },
  { label: "MARKETS NEEDING ATTENTION", headline: "6 of 13", delta: "4 at risk · 2 off track" },
];

test("the four KPI tiles show the portfolio figures", async ({ page }) => {
  await page.goto("/");
  for (const t of TILES) {
    const tile = page.getByRole("group", { name: t.label, exact: true });
    await expect(tile.locator('[data-slot="kpi-headline"]')).toHaveText(t.headline);
    await expect(tile.locator('[data-slot="kpi-delta"]')).toHaveText(t.delta);
    // Headlines are never coloured by direction.
    const colour = await tile
      .locator('[data-slot="kpi-headline"]')
      .evaluate((el) => getComputedStyle(el).color);
    const ink = await page.evaluate(() => getComputedStyle(document.body).color);
    expect(colour).toBe(ink);
  }
});

test("the attention tile uses the flat icon and ink-2, not a status colour", async ({ page }) => {
  await page.goto("/");
  const delta = page
    .getByRole("group", { name: "MARKETS NEEDING ATTENTION" })
    .locator('[data-slot="kpi-delta"]');
  await expect(delta).toHaveAttribute("data-direction", "flat");
  await expect(delta.locator("svg")).toHaveClass(/lucide-minus/);
});

test("Germany is on the map, focusable, and Enter drills in", async ({ page }) => {
  await page.goto("/");
  const germany = page.getByRole("button", { name: "Germany, off track, 92.0% attainment" });
  await expect(germany).toBeVisible();
  await germany.focus();
  await expect(page.getByRole("tooltip")).toContainText("Germany");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/market=de/);
});

test("View as table swaps the map for a 13-row table and back", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "View as table" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  const table = page.getByRole("table");
  await expect(table).toBeVisible();
  await expect(table.locator("tbody tr")).toHaveCount(13);
  const back = page.getByRole("button", { name: "View as chart" });
  await expect(back).toHaveAttribute("aria-pressed", "true");
  await back.click();
  await expect(table).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Germany, off track, 92.0% attainment" }),
  ).toBeVisible();
});

test("the metric select recolours the map and renames the card", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "Map metric" }).click();
  await page.getByRole("option", { name: "Revenue" }).click();
  await expect(page).toHaveURL(/metric=revenue/);
  await expect(page.getByRole("heading", { name: "Markets by Revenue" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Germany, off track, $1.68M revenue" }),
  ).toBeVisible();
});

test("top movers lead with China and Germany, with a real minus sign", async ({ page }) => {
  await page.goto("/");
  const movers = page.getByRole("region", { name: "Top movers" });
  const rows = movers.getByRole("listitem");
  await expect(rows.nth(0)).toContainText("China");
  await expect(rows.nth(0)).toContainText("+18.2%");
  await expect(rows.nth(3)).toContainText("Germany");
  await expect(rows.nth(3)).toContainText("−9.7%");
  await expect(movers).toContainText("Growth YoY, May 2026 · Source · data.json");
});

test("Ask why fills the composer and does not send", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ask why Germany dipped" }).click();
  const composer = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(composer).toHaveValue("Why did Germany dip?");
  await expect(composer).toBeFocused();
  await page.getByRole("button", { name: "Ask why China is on track" }).click();
  await expect(composer).toHaveValue("Why is China on track?");
});

test("a failed geometry request shows the fallback and forces the table", async ({ page }) => {
  await page.route("**/geo/markets.json", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Map unavailable")).toBeVisible();
  await expect(page.getByText("The market table below has the same data.")).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(13);
  await expect(page.getByRole("button", { name: /view as/i })).toHaveCount(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe finds no violations on the Overview in ${scheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "Germany, off track, 92.0% attainment" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "View as table" }).click();
    await expect(page.getByRole("table")).toBeVisible();
    const withTable = await new AxeBuilder({ page }).analyze();
    expect(withTable.violations).toEqual([]);
    await context.close();
  });
}
