import { expect, test, type Page } from "@playwright/test";

import { open } from "./helpers";

const EUROPE = "/?mode=analyst&region=eu";
const OVERVIEW = "/?mode=executive";

const card = (page: Page, name: RegExp | string) =>
  page.getByRole("region", { name, exact: typeof name === "string" });

test("the map draws a focus ring along the country for keyboard focus only, and has no native tooltip", async ({
  page,
}) => {
  await open(page, OVERVIEW);
  const map = page.getByRole("group", { name: /^Markets by / }).first();
  await expect(map).toBeVisible();
  // The accessible name is an aria-label; a <title> child would paint a native hover tooltip over the whole map.
  expect(await map.locator("title").count()).toBe(0);

  const market = map.getByRole("button").first();
  // A click selects and focuses, but draws no ring.
  await market.click();
  await expect(map.locator("g[aria-hidden='true'] path")).toHaveCount(0);

  // Arrow keys move focus: the ring is a stroke on a copy of the country, two paths (halo and ring).
  await page.keyboard.press("ArrowRight");
  await expect(map.locator("g[aria-hidden='true'] path")).toHaveCount(2);
  await expect(map.locator("g[aria-hidden='true'] path").last()).toHaveAttribute(
    "stroke",
    "var(--focus)",
  );
  // The native outline is off, so no bounding rectangle is drawn around the path.
  const outline = await map
    .getByRole("button")
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).outlineStyle).filter((s) => s !== "none"),
    );
  expect(outline).toEqual([]);
});

test("the radar compares Units YoY, pads its axes and draws the selected market last", async ({
  page,
}) => {
  await open(page, `${EUROPE}&market=de`);
  const radar = card(page, /^Compare/);
  await expect(radar.locator('[data-axis="Units YoY"]')).toBeVisible();
  await expect(radar.getByText("Forecast accuracy")).toHaveCount(0);
  await expect(radar.getByText("Axes scaled to the compared markets")).toBeVisible();
  // No ring carries a number: 0.5 and 1.0 would read as values.
  await expect(radar.locator("svg text", { hasText: /^(0\.5|1\.0)$/ })).toHaveCount(0);
  // The selected market is the last polygon, so it sits on top.
  const order = await radar
    .locator("path[data-series]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-series")));
  expect(order.at(-1)).toBe("de");
  expect(order).toHaveLength(5);
});

test("the heat map marks the anomaly month in the grid, the tooltip and the table", async ({
  page,
}) => {
  await open(page, EUROPE);
  const heat = card(page, /Attainment by month/);
  const cell = heat.locator('[data-market="de"][data-period="2026-03"]');
  await expect(cell).toHaveAttribute("aria-label", /anomaly$/);
  await expect(cell.locator("svg")).toHaveCount(1);
  // One flagged month in the whole grid.
  await expect(heat.locator('[role="gridcell"][aria-label$="anomaly"]')).toHaveCount(1);
  await cell.hover();
  await expect(page.getByRole("tooltip").first()).toContainText("Anomaly");
  await expect(page.getByRole("tooltip").first()).toContainText("Revenue fell 27%");
  await heat.getByRole("button", { name: /^View as table/ }).click();
  await expect(heat.getByRole("row", { name: /Germany/ })).toContainText("anomaly");
});

test("the time-series table shows compact dollars with the exact figure on hover and highlights the selected month", async ({
  page,
}) => {
  await open(page, `${EUROPE}&market=de`);
  const series = card(page, /^Germany revenue/);
  await series.getByRole("button", { name: /^View as table/ }).click();
  const table = series.getByRole("table");
  await expect(table.locator("caption")).toContainText("USD");
  const selected = table.locator('tr[data-state="selected"]');
  await expect(selected).toHaveCount(1);
  await expect(selected).toHaveAttribute("data-period", "2026-05");
  await expect(selected).toHaveAttribute("aria-current", "true");
  const actual = selected.locator("td").nth(1);
  await expect(actual).toHaveText(/^\$\d\.\d{2}M$/);
  await expect(actual).toHaveAttribute("title", /^\$[\d,]+$/);
});

test("the radar drops Units YoY in the first year of data and says why", async ({ page }) => {
  await open(page, `${EUROPE}&period=2025-03`);
  const radar = card(page, /^Compare/);
  await expect(radar.locator('[data-axis="Units YoY"]')).toHaveCount(0);
  await expect(radar.getByText("Units YoY unavailable before Jun 2025")).toBeVisible();
});

test("series legends sit on their own row under the title at every width, scale legends stay under the chart", async ({
  page,
}) => {
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, `${EUROPE}&market=de`);
    for (const [name, label] of [
      [/^Germany revenue/, "Series"],
      [/^Compare/, "Radar series"],
    ] as const) {
      const region = card(page, name);
      const legend = region.getByRole("list", { name: label });
      const header = region.locator('[data-slot="card-header"]');
      // The toggle belongs to the title row, not to a row of its own between the legend and the chart.
      await expect(header.getByRole("button", { name: /^View as table/ })).toBeVisible();
      const chart = region.getByRole("group").first();
      const h = await header.boundingBox();
      const l = await legend.boundingBox();
      const c = await chart.boundingBox();
      if (!h || !l || !c) throw new Error(`${label} legend or chart not laid out at ${width}`);
      // Below the header, above the chart, and not sharing the title row.
      expect(l.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
      expect(l.y + l.height).toBeLessThanOrEqual(c.y + 1);
    }
    // The heat map's colour scale keys the grid, so it stays below it.
    const heat = card(page, /Attainment by month/);
    const scale = heat.getByRole("list").last();
    const grid = heat.getByRole("grid");
    const g = await grid.boundingBox();
    const sc = await scale.boundingBox();
    if (!g || !sc) throw new Error("heat map grid or scale not laid out");
    expect(sc.y).toBeGreaterThanOrEqual(g.y + g.height - 1);
    expect(sc.y - (g.y + g.height)).toBeGreaterThanOrEqual(11);
  }
});

for (const [width, rail] of [
  [1440, "with the rail open"],
  [1280, ""],
] as const) {
  test(
    `the radar toggle is top-aligned with the title and the caption sits bottom-right ${rail || "at 1280"}`.trim(),
    async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, `${EUROPE}&market=de`);
      const region = card(page, /^Compare/);
      const header = region.locator('[data-slot="card-header"]');
      const eyebrow = header.getByRole("heading").locator("span").first();
      const toggle = header.getByRole("button", { name: /^View as table/ });
      const caption = region.getByText(/derived · share from data\.json/);
      const e = await eyebrow.boundingBox();
      const t = await toggle.boundingBox();
      const c = await caption.boundingBox();
      const r = await region.boundingBox();
      const h = await header.boundingBox();
      if (!e || !t || !c || !r || !h) throw new Error("radar card not laid out");
      // The toggle's top matches the eyebrow's line, give or take the button's own padding.
      expect(Math.abs(t.y - h.y)).toBeLessThanOrEqual(6);
      expect(Math.abs(e.y - h.y)).toBeLessThanOrEqual(6);
      // The caption is below the chart, flush with the card's right padding, and not in the title row.
      expect(c.y).toBeGreaterThanOrEqual(h.y + h.height);
      expect(r.x + r.width - (c.x + c.width)).toBeLessThanOrEqual(40);
    },
  );
}

test("Overview cards put the provenance caption bottom-right of the card, not in the title row", async ({
  page,
}) => {
  for (const width of [1440, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, OVERVIEW);
    for (const name of ["Needs attention", "By region"]) {
      const region = card(page, name);
      const header = region.locator('[data-slot="card-header"]');
      const caption = region.locator("p.self-end").last();
      const r = await region.boundingBox();
      const h = await header.boundingBox();
      const c = await caption.boundingBox();
      if (!r || !h || !c) throw new Error(`${name} card not laid out at ${width}`);
      expect(c.y).toBeGreaterThan(h.y + h.height);
      expect(r.x + r.width - (c.x + c.width)).toBeLessThanOrEqual(40);
      // The caption is the card's last line.
      expect(r.y + r.height - (c.y + c.height)).toBeLessThanOrEqual(40);
    }
  }
});
