import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { open } from "./helpers";

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
  await expect(page.getByText("You asked, about Germany · May 2026:")).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" })).toBeVisible({ timeout: 8000 });
  await expect(composer).toBeFocused();
});

test("the panel empty state puts the composer first", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("complementary");
  const first = await panel.evaluate((el) => {
    const focusable = el
      .querySelector("#assistant-panel")
      ?.querySelector<HTMLElement>(
        'button:not([aria-label="Collapse assistant"]), textarea, a[href], input, select',
      );
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
  const products = page.getByRole("region", { name: "Products", exact: true });
  await expect(products.getByRole("row")).toHaveCount(6);
  await expect(products).toContainText("Veltrix");
});

test("the map table and the legend still work at the new position", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const map = page.getByRole("region", { name: "Markets by status" });
  await expect(map.getByRole("list", { name: /colour scale/ })).toBeVisible();
  await map.getByRole("button", { name: "View as table" }).click();
  await expect(map.getByRole("table").locator("tbody tr")).toHaveCount(13);
});

test("tab order from the skip link", async ({ page }) => {
  await page.goto("/");
  const seen: string[] = [];
  for (let i = 0; i < 13; i++) {
    await page.keyboard.press("Tab");
    seen.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        return el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? el?.tagName ?? "";
      }),
    );
  }
  expect(seen.slice(0, 8)).toEqual([
    "Skip to content",
    "Live",
    "Paused",
    "Executive",
    "Switch to dark theme",
    "Signed in as Dana Whitfield, Executive. Account menu",
    "Period",
    "Product. Select a market first.",
  ]);
  expect(seen[8]).toBe("About this verdict");
  expect(seen.slice(9, 12)).toEqual([
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

test("the map is coloured by status with a three-item legend and no metric control", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "Markets by status" });
  await expect(map.getByRole("radiogroup", { name: "Map metric" })).toHaveCount(0);
  await expect(
    map.getByRole("list", { name: "Status colour scale" }).getByRole("listitem"),
  ).toHaveText(["On track", "At risk", "Off track"]);
  const fill = (name: RegExp) =>
    map.getByRole("button", { name }).evaluate((el) => el.getAttribute("fill"));
  expect(await fill(/^Germany,/)).toBe("var(--bad-mark)");
  expect(await fill(/^Italy,/)).toBe("var(--warn-mark)");
  expect(await fill(/^China,/)).toBe("var(--ok-mark)");
});

test("tile provenance sits in a tooltip on the info button", async ({ page }) => {
  await page.goto("/");
  const tile = page.getByRole("group", { name: "FORECAST ATTAINMENT" });
  await expect(tile.locator('[data-slot="kpi-provenance"]')).toHaveClass(/sr-only/);
  await tile.getByRole("button", { name: "About forecast attainment" }).focus();
  await expect(page.getByRole("tooltip").first()).toContainText("Derived · sum of series");
});

test("region revenue shows two decimals on both views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("region", { name: "By region" })).toContainText("$7.06M");
  await open(page, "/?mode=analyst");
  await expect(page.getByText("$7.06M").first()).toBeVisible();
});

test("the status legend uses the strip's marks and sits centred under the map", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("region", { name: "Markets by status" });
  const legend = map.getByRole("list", { name: "Status colour scale" });
  await expect(legend.locator("svg")).toHaveCount(3);
  await expect(legend.locator("polygon")).toHaveCount(2);
  await expect(legend.locator("circle")).toHaveCount(1);
  const [l, m] = await Promise.all([legend.boundingBox(), map.boundingBox()]);
  const items = await legend.getByRole("listitem").evaluateAll((els) => {
    const rects = els.map((el) => el.getBoundingClientRect());
    return { left: rects[0]!.left, right: rects[rects.length - 1]!.right };
  });
  const centre = (items.left + items.right) / 2;
  expect(Math.abs(centre - (m!.x + m!.width / 2))).toBeLessThan(8);
  expect(l!.width).toBeGreaterThan(0);
});

test("the executive map ignores the URL metric", async ({ page }) => {
  await page.goto("/?metric=growth");
  await expect(
    page.getByRole("button", { name: "Germany, off track, 92.0% attainment" }),
  ).toBeVisible();
});

test("the info button names the figure in sentence case", async ({ page }) => {
  await page.goto("/?region=eu&market=de");
  await expect(page.getByRole("button", { name: "About Germany revenue" })).toBeVisible();
});

test("Analyst says the strip provenance once, as visible text", async ({ page }) => {
  await open(page, "/?mode=analyst");
  const line = page.locator('[data-slot="kpi-provenance-line"]');
  await expect(line).toHaveText("Derived · sum of series · Source data.json");
  await expect(line).toBeVisible();
  // Said once for the strip: the tiles carry no caption of their own.
  const tile = page.getByRole("group", { name: "FORECAST ATTAINMENT" });
  await expect(tile.getByText("Derived · sum of series")).toHaveCount(0);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tapping the info button opens the provenance tooltip and a second tap closes it", async ({
    page,
  }) => {
    await page.goto("/");
    const button = page.getByRole("button", { name: "About forecast attainment" });
    await button.tap();
    await expect(page.getByRole("tooltip").first()).toContainText("Derived · sum of series");
    await button.tap();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });
});

test("the verdict's provenance sits in a tooltip on the Overview", async ({ page }) => {
  await page.goto("/");
  const info = page.getByRole("button", { name: "About this verdict" });
  await info.focus();
  await expect(page.getByRole("tooltip").first()).toContainText("Derived · sum of series");
});

test("at product level the cards that show all products say so and their Analyst titles step back", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&region=eu&market=de&product=veltrix&period=2026-03");
  const compare = page.getByRole("region", { name: /^Compare/ });
  await expect(compare).toContainText("Europe markets · All products");
  await expect(compare.getByText("Compare", { exact: true })).toHaveCSS(
    "color",
    await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.className = "text-ink-2";
      document.body.append(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    }),
  );
  await expect(page.getByRole("region", { name: /^Map/ })).toContainText(
    "Markets by attainment · All products · March 2026",
  );
  await expect(page.getByRole("region", { name: /^Attainment by month/ })).toContainText(
    "Europe markets · All products",
  );
  // The status tile is the shared badge with a one-line caption.
  const status = page.getByRole("group", { name: "STATUS" });
  await expect(status.locator('[data-slot="status-badge"]')).toBeVisible();
  const box = await status.locator('[data-slot="kpi-delta"]').boundingBox();
  expect(box!.height).toBeLessThan(20);
});

test("the Executive view carries the same four-tile grammar and the scope in the card subtitles", async ({
  page,
}) => {
  await page.goto("/?region=eu&market=de&product=veltrix");
  await expect(page.getByRole("group", { name: "STATUS" })).toBeVisible();
  await expect(page.getByRole("region", { name: "By region" })).toContainText("All products");
  await expect(page.getByRole("region", { name: /^Markets by/ })).toContainText("All products");
});
