import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { open } from "./helpers";

const GERMANY = { name: "Germany, off track, 92.0% attainment" };

test("clicking Germany on the map drills in: URL, breadcrumb and revenue tile", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", GERMANY).click();
  await expect(page).toHaveURL(/region=eu&market=de/);
  await expect(
    page.getByRole("navigation", { name: "Drill path" }).locator("[aria-current=page]"),
  ).toHaveText("Germany");
  const revenue = page.getByRole("group", { name: "GERMANY REVENUE", exact: true });
  await expect(revenue.locator('[data-slot="kpi-headline"]')).toHaveText("$1.68M");
});

test("selecting Veltrix adds product to the URL and the document title", async ({ page }) => {
  await page.goto("/?region=eu&market=de");
  await page.getByRole("combobox", { name: "Product" }).click();
  await page.getByRole("option", { name: "Veltrix" }).click();
  await expect(page).toHaveURL(/product=veltrix/);
  await expect(page).toHaveTitle(/Germany · Veltrix/);
});

test("a link with an unknown value is replaced by the address of what is shown", async ({
  page,
}) => {
  await page.goto("/");
  await page.goto("/?region=eu&market=xx&period=2030-01&mode=executive");
  await expect(page).toHaveURL(/\/\?region=eu&mode=executive$/);
  await expect(
    page.getByRole("navigation", { name: "Drill path" }).locator("[aria-current=page]"),
  ).toHaveText("Europe");
  // Replaced, not pushed: Back leaves the bad address behind.
  await page.goBack();
  await expect(page).toHaveURL(/\/\?mode=executive$/);
});

test("a deep link renders every part of the state", async ({ page }) => {
  await open(page, "/?region=eu&market=de&product=veltrix&period=2026-03&mode=analyst");
  const crumbs = page.getByRole("navigation", { name: "Drill path" });
  await expect(crumbs.locator("[aria-current=page]")).toHaveText("Veltrix");
  await expect(crumbs).toContainText("Europe");
  await expect(page.getByRole("combobox", { name: "Period" })).toContainText("March 2026");
  await expect(page.getByRole("combobox", { name: "Product" })).toContainText("Veltrix");
  await expect(page.getByRole("radio", { name: "Analyst" })).toBeChecked();
  await expect(
    page.getByRole("heading", { level: 3, name: /^Germany · Veltrix revenue/ }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Germany · Veltrix · March 2026 · Market Ops");
});

test("Back twice returns to the original state and Forward re-applies it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", GERMANY).click();
  await expect(page).toHaveURL(/market=de/);
  await page.getByRole("combobox", { name: "Product" }).click();
  await page.getByRole("option", { name: "Veltrix" }).click();
  await expect(page).toHaveURL(/product=veltrix/);

  await page.goBack();
  await expect(page).not.toHaveURL(/product=/);
  await page.goBack();
  await expect(page).toHaveURL(/\/\?mode=executive$/);
  await expect(
    page.getByRole("navigation", { name: "Drill path" }).locator("[aria-current=page]"),
  ).toHaveText("Portfolio");

  await page.goForward();
  await expect(page).toHaveURL(/market=de/);
  await page.goForward();
  await expect(page).toHaveURL(/product=veltrix/);
});

test("the Portfolio breadcrumb clears the drill and keeps mode", async ({ page }) => {
  await open(page, "/?region=eu&market=de&mode=analyst&period=2026-03");
  const link = page.getByRole("link", { name: "Portfolio" });
  await expect(link).toHaveAttribute("href", "/?period=2026-03&mode=analyst");
  await link.click();
  await expect(page).toHaveURL(/mode=analyst/);
  await expect(page).toHaveURL(/period=2026-03/);
  await expect(page).not.toHaveURL(/market=|region=/);
});

test("the page toolbar carries Period and Product in Executive and there is no period chip", async ({
  page,
}) => {
  await page.goto("/");
  const toolbar = page.getByRole("toolbar", { name: "Executive controls" });
  await expect(toolbar.getByRole("combobox", { name: "Period" })).toBeVisible();
  await expect(toolbar.getByRole("combobox", { name: "Product" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Clear period" })).toHaveCount(0);
  await toolbar.getByRole("combobox", { name: "Period" }).click();
  await page.getByRole("option", { name: "March 2026" }).click();
  await expect(page).toHaveURL(/period=2026-03/);
  await expect(page.getByRole("button", { name: "Clear period" })).toHaveCount(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`axe finds no violations on Germany · Veltrix in ${scheme}`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto("/?region=eu&market=de&product=veltrix&period=2026-03");
    await expect(page.getByRole("heading", { name: /^Germany · Veltrix is / })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await context.close();
  });
}

test("the header keeps one row and the same height from portfolio to Germany · Veltrix at 1440 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const height = async () => (await page.locator("header").boundingBox())!.height;
  const toolbarTop = async () =>
    (await page.getByRole("toolbar", { name: "Executive controls" }).boundingBox())!.y;

  await page.goto("/");
  const portfolio = await height();
  const toolbar = await toolbarTop();
  await page.goto("/?region=eu&market=de&product=veltrix&period=2026-03");
  const product = page.getByRole("toolbar", { name: "Executive controls" }).getByRole("combobox", {
    name: "Product",
  });
  await expect(product).toBeEnabled();
  expect(await height()).toBe(portfolio);
  expect(await toolbarTop()).toBe(toolbar);

  // The header's controls share one row, and the breadcrumb still ends in the current crumb.
  const tops = await Promise.all(
    [
      page.getByRole("radiogroup", { name: "View" }),
      page.getByRole("button", { name: /Switch to (dark|light) theme/ }),
    ].map(async (l) => {
      const b = (await l.boundingBox())!;
      return b.y + b.height / 2;
    }),
  );
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
  await expect(
    page.getByRole("navigation", { name: "Drill path" }).locator("[aria-current=page]"),
  ).toBeVisible();
});
