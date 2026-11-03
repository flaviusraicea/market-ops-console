import AxeBuilder from "@axe-core/playwright";
import { devices, expect, test } from "@playwright/test";

import { onChromium, open } from "./helpers";

const iPhone = onChromium(devices["iPhone 14"]!);

const ANALYST = "/?mode=analyst&region=eu&market=de";
const DRILL = "/?region=eu&market=de";

test("the revenue chart tooltip stays whole at every hover position", async ({ page }) => {
  await open(page, ANALYST);
  const cursor = page.locator('[data-slot="chart-cursor"]').first();
  const chart = cursor.locator("xpath=..");
  await cursor.scrollIntoViewIfNeeded();
  const area = (await cursor.boundingBox())!;
  const frame = (await chart.boundingBox())!;
  for (const fx of [0.1, 0.3, 0.5, 0.7, 0.9]) {
    await page.mouse.move(area.x + area.width * fx, area.y + area.height / 2);
    const tip = page.getByRole("tooltip").first();
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("Actual");
    const box = (await tip.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(frame.y);
    expect(box.y + box.height).toBeLessThanOrEqual(frame.y + frame.height);
    expect(box.x).toBeGreaterThanOrEqual(frame.x);
    expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  }
});

test.describe("phone", () => {
  test.use(iPhone);

  test("a market's products table scrolls by keyboard and has a name (axe scrollable-region-focusable)", async ({
    page,
  }) => {
    await open(page, DRILL);
    const region = page.getByRole("region", { name: "Products table, scrollable" });
    await expect(region).toHaveAttribute("tabindex", "0");
    const results = await new AxeBuilder({ page })
      .withRules(["scrollable-region-focusable"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("each region group is narrower than the screen, so its chips snap into view whole", async ({
    page,
  }) => {
    await open(page, "/");
    const strip = page.getByRole("group", { name: "Market status by region" });
    const groups = strip.getByRole("group");
    const count = await groups.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      const group = groups.nth(i);
      await group.evaluate((el) => el.scrollIntoView({ inline: "start", block: "nearest" }));
      const stripBox = (await strip.boundingBox())!;
      const chips = group.locator("[data-chip]");
      for (let j = 0; j < (await chips.count()); j++) {
        const box = (await chips.nth(j).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(stripBox.x - 1);
        expect(box.x + box.width).toBeLessThanOrEqual(stripBox.x + stripBox.width + 1);
      }
    }
  });
});
