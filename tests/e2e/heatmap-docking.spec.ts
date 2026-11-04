import { expect, test } from "@playwright/test";
import { open } from "./helpers";

// The assistant docks over 400 ms and narrows the card; a slow machine must not leave the grid short of the latest month.
test("the heat map stays at its latest month while the assistant docks, on a slow CPU", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await open(page, "/?mode=analyst");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.locator("[data-panel]")).toHaveAttribute("data-panel", "open");
  const grid = page.getByRole("grid").first();
  await grid.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const r = await grid.evaluate((g) => {
    const el = g.parentElement!;
    return { left: el.scrollLeft, max: el.scrollWidth - el.clientWidth };
  });
  expect(r.left).toBeGreaterThanOrEqual(r.max - 1);
});

test("a reader who scrolls the docked heat map back keeps their place", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await open(page, "/?mode=analyst");
  await page.getByRole("button", { name: "Open assistant" }).click();
  await expect(page.locator("[data-panel]")).toHaveAttribute("data-panel", "open");
  const grid = page.getByRole("grid").first();
  await grid.scrollIntoViewIfNeeded();
  const scroller = grid.locator("xpath=..");
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBeGreaterThan(40);
  // The reader's own wheel, over the grid.
  const box = (await grid.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(-40, 0);
  await page.waitForTimeout(300);
  const r = await scroller.evaluate((el) => ({
    left: el.scrollLeft,
    max: el.scrollWidth - el.clientWidth,
  }));
  expect(r.left).toBeLessThan(r.max - 20);
});
