import { expect, test, type Page } from "@playwright/test";

import { open } from "./helpers";

/**
 * With the assistant docked (1024 to 1279 px) the dashboard is 640 to 900 px wide. These checks look inside the
 * cards, where the page-level "no horizontal scroll" check cannot see an overflow.
 */
async function docked(page: Page, width: number, url: string) {
  await page.setViewportSize({ width, height: 900 });
  await open(page, url);
  const panel = page.locator("[data-panel]");
  if ((await panel.getAttribute("data-panel")) !== "open") {
    await page.getByRole("button", { name: "Open assistant" }).click();
  }
  await expect(panel).toHaveAttribute("data-panel", "open");
  await expect(page.locator("#assistant-panel")).toBeVisible();
}

const box = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);

for (const width of [1024, 1152]) {
  test.describe(`docked at ${width} px`, () => {
    test("by region: the 100% tick sits at the same x in every row", async ({ page }) => {
      await docked(page, width, "/?mode=executive");
      const ticks = page.locator(
        "section[aria-labelledby='regions-h'] li button span.bg-ink-muted",
      );
      await expect(ticks).toHaveCount(4);
      const xs = await ticks.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left));
      const first = xs[0] ?? Number.NaN;
      for (const x of xs) expect(Math.abs(x - first)).toBeLessThan(1);
    });

    test("top movers: every name has room for its first letters, on one line", async ({ page }) => {
      await docked(page, width, "/?mode=executive");
      const names = page.locator(
        "[aria-labelledby='movers-rising-h'] li button > span:first-child",
      );
      expect(await names.count()).toBeGreaterThan(0);
      const sizes = await names.evaluateAll((els) =>
        els.map((el) => ({
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
        })),
      );
      for (const { w, h } of sizes) {
        expect(w).toBeGreaterThanOrEqual(120);
        expect(h).toBeLessThanOrEqual(24);
      }
    });

    test("needs attention: every Ask why stays inside the card", async ({ page }) => {
      await docked(page, width, "/?mode=executive");
      const card = await box(page, "section[aria-labelledby='attention-h']");
      const asks = page
        .locator("section[aria-labelledby='attention-h']")
        .getByRole("button", { name: /^Ask why/ });
      expect(await asks.count()).toBeGreaterThan(0);
      const rights = await asks.evaluateAll((els) =>
        els.map((el) => el.getBoundingClientRect().right),
      );
      for (const r of rights) expect(r).toBeLessThanOrEqual(card.right);
    });

    test("radar: every axis label is inside the chart", async ({ page }) => {
      await docked(page, width, "/?mode=analyst");
      const labels = page.locator("text[data-axis]");
      await expect(labels.first()).toBeVisible();
      const out = await labels.evaluateAll((els) =>
        els.map((el) => {
          const svg = el.closest("svg")!.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return {
            l: r.left - svg.left,
            r: svg.right - r.right,
            t: r.top - svg.top,
            b: svg.bottom - r.bottom,
          };
        }),
      );
      for (const o of out) for (const v of Object.values(o)) expect(v).toBeGreaterThanOrEqual(0);
    });

    test("map legend: bin labels keep at least 8 px between them", async ({ page }) => {
      await docked(page, width, "/?mode=analyst");
      const items = page
        .getByRole("list", { name: /colour scale/ })
        .first()
        .locator("li > span");
      await expect(items.first()).toBeVisible();
      const rects = await items.evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top };
        }),
      );
      for (let i = 1; i < rects.length; i++) {
        const a = rects[i - 1]!;
        const b = rects[i]!;
        if (Math.abs(a.top - b.top) < 2) expect(b.left - a.right).toBeGreaterThanOrEqual(8);
      }
    });

    test("heat map: month labels keep 8 px apart, inside the grid, and the latest month is labelled", async ({
      page,
    }) => {
      await docked(page, width, "/?mode=analyst");
      const grid = page.getByRole("grid").first();
      await grid.scrollIntoViewIfNeeded();
      const labels = grid.locator("[data-month-label]");
      await expect(labels.first()).toBeVisible();
      const { rects, gridRight, lastColRight } = await grid.evaluate((g) => {
        const cols = [...g.querySelectorAll("[data-month]")];
        return {
          rects: [...g.querySelectorAll("[data-month-label]")].map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          }),
          gridRight: g.getBoundingClientRect().right,
          lastColRight: cols[cols.length - 1]?.getBoundingClientRect().right ?? Number.NaN,
        };
      });
      for (let i = 1; i < rects.length; i++)
        expect(rects[i]!.left - rects[i - 1]!.right).toBeGreaterThanOrEqual(8);
      const last = rects[rects.length - 1]!;
      expect(last.right).toBeLessThanOrEqual(gridRight + 0.5);
      expect(Math.abs(last.right - lastColRight)).toBeLessThan(1);
    });
  });
}
