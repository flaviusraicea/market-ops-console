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

test("below about 1,250 px the grid scrolls between a pinned Market column and a pinned Ask why column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1060, height: 900 });
  await open(page);
  const box = page.getByRole("region", { name: "Markets, scrollable" });
  await box.scrollIntoViewIfNeeded();
  const edges = () =>
    box.evaluate((el) => {
      const row = el.querySelector("tbody tr")!;
      const rect = (sel: string) => row.querySelector(sel)!.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return {
        start: el.hasAttribute("data-scroll-start"),
        end: el.hasAttribute("data-scroll-end"),
        market: rect('[data-pin="start"]').left - b.left,
        action: b.right - rect('[data-pin="end"]').right,
      };
    });
  // At the start only the right edge can scroll, and both pinned columns sit at their edges.
  let e = await edges();
  expect(e.start).toBe(false);
  expect(e.end).toBe(true);
  expect(Math.abs(e.market)).toBeLessThanOrEqual(1);
  expect(e.action).toBeGreaterThanOrEqual(0);
  await box.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await expect(box).toHaveAttribute("data-scroll-start", "");
  await expect(box).not.toHaveAttribute("data-scroll-end", "");
  e = await edges();
  expect(Math.abs(e.market)).toBeLessThanOrEqual(1);
  // Back at the start, Units sits under the pinned Ask why column; focus brings it clear of the pin.
  await box.evaluate((el) => (el.scrollLeft = 0));
  const covered = () =>
    box.evaluate((el) => {
      const th = [...el.querySelectorAll("th")].find((h) => h.textContent?.trim() === "Units")!;
      const pin = th.closest("tr")!.querySelector('[data-pin="end"]')!.getBoundingClientRect();
      return th.getBoundingClientRect().right > pin.left + 1;
    });
  expect(await covered()).toBe(true);
  await box.getByRole("button", { name: "Units", exact: true }).focus();
  const clear = !(await covered());
  expect(clear).toBe(true);
});

test("while the grid scrolls, names stay whole, figures align with the total, and a focused row keeps its whole ring", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1150, height: 900 });
  await open(page);
  const box = page.getByRole("region", { name: "Markets, scrollable" });
  await box.scrollIntoViewIfNeeded();
  await expect(box).toHaveAttribute("data-overflow", "");
  const m = await box.evaluate((el) => {
    const names = [...el.querySelectorAll('tbody [data-pin="start"] span.truncate')];
    // The right edge of a cell's figure: its first text, not the cell or the note slot beside it.
    const right = (cell: Element) => {
      const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
      let node = walk.nextNode();
      while (node && !node.textContent?.trim()) node = walk.nextNode();
      const r = document.createRange();
      r.selectNodeContents(node ?? cell);
      return r.getBoundingClientRect().right;
    };
    // The cell at a column index, counting colspans (the footer's label spans three columns).
    const cellAt = (tr: Element, index: number) => {
      let at = 0;
      for (const c of tr.children) {
        at += (c as HTMLTableCellElement).colSpan;
        if (at > index) return c;
      }
      throw new Error("no cell at " + index);
    };
    const col = [...el.querySelectorAll("thead th")].findIndex((h) =>
      h.textContent?.includes("Attainment"),
    );
    const rows = [...el.querySelectorAll("tbody tr, tfoot tr")];
    const cells = rows.map((tr) => cellAt(tr, col));
    const units = rows.map((tr) => {
      const c = cellAt(tr, col + 3);
      return { cell: c.getBoundingClientRect().right, text: right(c) };
    });
    return {
      clipped: names.filter((n) => n.scrollWidth > n.clientWidth).map((n) => n.textContent),
      attainment: cells.map(right),
      units,
    };
  });
  expect(m.clipped).toEqual([]);
  const first = m.attainment[0]!;
  for (const x of m.attainment) expect(Math.abs(x - first)).toBeLessThanOrEqual(1);
  for (const u of m.units) expect(u.text).toBeLessThanOrEqual(u.cell);
  // Scroll halfway, focus a row: both pinned cells draw their share of the ring.
  await box.evaluate((el) => (el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2));
  await page.keyboard.press("Tab");
  const row = box.locator("tbody tr").first();
  await row.focus();
  const shadows = await row.evaluate((tr) =>
    [...tr.querySelectorAll("[data-pin]")].map((c) => getComputedStyle(c).boxShadow),
  );
  expect(shadows).toHaveLength(2);
  for (const sh of shadows) expect(sh.match(/inset/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
});

test("with room, the Markets table reaches the card's right edge", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  const box = page.getByRole("region", { name: "Markets, scrollable" });
  await box.scrollIntoViewIfNeeded();
  const gap = await box.evaluate(
    (el) =>
      el.getBoundingClientRect().right - el.querySelector("table")!.getBoundingClientRect().right,
  );
  expect(Math.abs(gap)).toBeLessThanOrEqual(1);
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
