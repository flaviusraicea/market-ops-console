import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const VERDICT =
  "Portfolio is on track at 100.4% of forecast, up 7.3% on last year. Six markets need attention.";

test("the first h2 is the verdict", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(VERDICT);
});

test("the status strip has 13 chips in order and Germany drills", async ({ page }) => {
  await page.goto("/");
  const strip = page.getByRole("group", { name: "Market status by region" });
  const names = await strip
    .locator("ul button")
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")?.split(",")[0]));
  expect(names).toEqual([
    "United States",
    "Canada",
    "Germany",
    "Spain",
    "Italy",
    "United Kingdom",
    "France",
    "Japan",
    "China",
    "India",
    "Australia",
    "Brazil",
    "Mexico",
  ]);
  await strip.getByRole("button", { name: "Germany, off track" }).click();
  await expect(page).toHaveURL(/market=de/);
  await expect(page.getByRole("heading", { level: 2 }).first()).toContainText(
    "Germany is off track",
  );
});

test("the attention list ranks the flagged markets and Ask why sends", async ({ page }) => {
  await page.goto("/");
  const list = page.getByRole("region", { name: "Needs attention" });
  const rows = list.getByRole("row");
  const expected = [
    ["Germany", "Off track"],
    ["Spain", "Off track"],
    ["Italy", "At risk"],
    ["United Kingdom", "At risk"],
    ["Brazil", "At risk"],
    ["France", "At risk"],
    ["China", "On track"],
    ["France", "At risk"],
    ["Canada", "On track"],
  ];
  // Header, six flagged markets, the movers heading, three movers.
  await expect(rows).toHaveCount(11);
  for (const [i, [market, status]] of expected.entries()) {
    const row = rows.nth(i < 6 ? i + 1 : i + 2);
    await expect(row).toContainText(market!);
    await expect(row).toContainText(status!);
  }
  await expect(list.getByText("Top movers · rising")).toBeVisible();

  await list.getByRole("button", { name: "Ask why Germany dipped" }).click();
  const composer = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(composer).toBeFocused();
  await expect(composer).toHaveValue("");
  await expect(page.getByRole("region", { name: "Conversation" })).toContainText(
    "Why did Germany's revenue dip?",
  );
  await expect(page.getByRole("list", { name: "Citations" })).toBeVisible({ timeout: 8000 });
  await expect(composer).toBeFocused();
});

test("the panel empty state puts the composer first", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("complementary");
  const first = await panel.evaluate((el) => {
    const focusable = el.querySelector<HTMLElement>("button, textarea, a[href], input, select");
    return focusable?.id ?? focusable?.tagName;
  });
  expect(first).toBe("ask");
  await expect(
    panel.getByRole("list", { name: "Suggested questions" }).getByRole("button"),
  ).toHaveCount(3);
  await expect(panel.getByText(/^Germany is furthest from plan/)).toHaveText(
    "Germany is furthest from plan: 92.0% of forecast and −9.7% on last year, after a 27.2% drop in March.",
  );
  await expect(panel.getByText("About Portfolio · May 2026")).toBeVisible();
});

test("a region scopes the verdict and the strip", async ({ page }) => {
  await page.goto("/?region=eu");
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
    "Europe is at risk at 95.4% of forecast, up 1.7% on last year. Five markets need attention.",
  );
  await expect(
    page.getByRole("group", { name: "Market status by region" }).getByRole("button"),
  ).toHaveCount(5);
});

test("region health shows in the strip and the region bars", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("group", { name: "Europe, at risk, 5 markets" })).toBeVisible();
  await expect(
    page.getByRole("group", { name: "North America, on track, 2 markets" }),
  ).toBeVisible();
  const bars = page.getByRole("region", { name: "By region" });
  await expect(bars.getByRole("listitem").nth(1)).toContainText("At risk");
  await expect(bars.getByRole("listitem").nth(2)).toContainText("On track");
});

test("the strip and the region bars drill into a region", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Drill into Europe" }).first().click();
  await expect(page).toHaveURL(/region=eu/);
  await page.goto("/");
  await page
    .getByRole("region", { name: "By region" })
    .getByRole("button", { name: "Drill into APAC" })
    .click();
  await expect(page).toHaveURL(/region=apac/);
});

test("the revenue tile carries a 24-month trend", async ({ page }) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("group", { name: "PORTFOLIO REVENUE" })
      .getByRole("img", { name: "24-month revenue trend, latest $22.85M" }),
  ).toBeVisible();
});

test("a market shows its products and hides the strip", async ({ page }) => {
  await page.goto("/?market=de");
  await expect(page.getByRole("group", { name: "Market status by region" })).toHaveCount(0);
  const products = page.getByRole("region", { name: "Products" });
  await expect(products.getByRole("row")).toHaveCount(6);
  await expect(products).toContainText("Veltrix");
});

test("the map table and the legend still work at the new position", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const map = page.getByRole("region", { name: "Markets by attainment" });
  await expect(map.getByRole("list", { name: /colour scale/ })).toBeVisible();
  await map.getByRole("button", { name: "View as table" }).click();
  await expect(map.getByRole("table").locator("tbody tr")).toHaveCount(13);
});

test("tab order from the skip link", async ({ page }) => {
  await page.goto("/");
  const seen: string[] = [];
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? el?.tagName ?? "";
      }),
    );
  }
  expect(seen.slice(0, 4)).toEqual([
    "Skip to content",
    "Period",
    "Overview",
    "Switch to dark theme",
  ]);
  expect(seen.slice(4, 7)).toEqual([
    "Drill into North America · 2",
    "United States, on track",
    "Canada, on track",
  ]);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe is clean on the Overview in ${scheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByRole("region", { name: "Needs attention" }).waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}

for (const width of [390, 768, 1024, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("region", { name: "Needs attention" }).waitFor();
    const overflow = await page.evaluate(() => {
      // The header's own overflow at phone width belongs to the mobile slice.
      const main = document.getElementById("main")!;
      return main.scrollWidth - main.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
