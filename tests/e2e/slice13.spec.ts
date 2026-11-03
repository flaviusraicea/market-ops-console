import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [1440, 1280]) {
  test(`breadcrumb shows Portfolio in full at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Drill path" });
    await expect(nav).toHaveText("Portfolio");
    const crumb = nav.getByText("Portfolio");
    const fits = await crumb.evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(fits).toBe(true);
  });
}

test("the full drill path is visible at 1280px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?region=eu&market=de");
  const nav = page.getByRole("navigation", { name: "Drill path" });
  await expect(nav).toContainText("Portfolio");
  await expect(nav).toContainText("Europe");
  await expect(nav).toContainText("Germany");
  const truncated = await nav
    .getByRole("listitem")
    .evaluateAll((els) =>
      els.some((li) =>
        [...li.querySelectorAll("a, span")].some((n) => n.scrollWidth > n.clientWidth),
      ),
    );
  expect(truncated).toBe(false);
});

test("the map legend sits directly under the map, inside the card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const map = page.getByRole("region", { name: /Markets by/ });
  const svg = map.getByRole("group", { name: /Markets by/ });
  await svg.waitFor();
  const legend = map.getByRole("list", { name: /colour scale/ });
  const svgBox = (await svg.boundingBox())!;
  const legendBox = (await legend.boundingBox())!;
  expect(legendBox.y - (svgBox.y + svgBox.height)).toBeLessThanOrEqual(24);
  expect(legendBox.y).toBeGreaterThanOrEqual(svgBox.y + svgBox.height - 1);
});

test("the metric control is a segmented radiogroup and the attention eyebrow does not wrap", async ({
  page,
}) => {
  await page.goto("/");
  const group = page.getByRole("radiogroup", { name: "Map metric" });
  await expect(group.getByRole("radio")).toHaveText(["Attainment", "Revenue", "Growth"]);
  const tile = page.getByRole("group", { name: "NEEDS ATTENTION" });
  await expect(tile).toBeVisible();
  const lines = await tile
    .getByText("NEEDS ATTENTION", { exact: true })
    .evaluate((el) => el.getBoundingClientRect().height);
  expect(lines).toBeLessThanOrEqual(14);
});

test("top movers second column is titled Lowest growth", async ({ page }) => {
  await page.goto("/");
  const movers = page.getByRole("region", { name: "Top movers" });
  await expect(movers.getByRole("heading", { name: "Lowest growth" })).toBeVisible();
  await expect(movers.getByText("Falling")).toHaveCount(0);
});

for (const theme of ["light", "dark"] as const) {
  test(`overview has no axe violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("group", { name: /Markets by/ }).waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("KPI headlines use tabular serif figures of equal width", async ({ page }) => {
  await page.goto("/");
  const head = page.locator('[data-slot="kpi-headline"]').first();
  await head.waitFor();
  await page.evaluate(() => document.fonts.ready);
  const widths = await head.evaluate((el) => {
    const measure = (text: string) => {
      const probe = document.createElement("span");
      probe.className = el.className;
      probe.style.position = "absolute";
      probe.style.visibility = "hidden";
      probe.textContent = text;
      el.parentElement!.appendChild(probe);
      const w = probe.getBoundingClientRect().width;
      probe.remove();
      return w;
    };
    return [measure("$22.85M"), measure("$11.11M")];
  });
  expect(Math.abs(widths[0]! - widths[1]!)).toBeLessThanOrEqual(1);
});
