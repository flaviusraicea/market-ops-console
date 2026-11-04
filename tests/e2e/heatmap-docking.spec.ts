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
  const scroller = grid.locator("xpath=..");
  const position = () =>
    scroller.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));
  // The dock takes 400 ms (longer at 6×): wait for the card to have narrowed, then for the grid to have settled at
  // its end, rather than for a fixed time a slower machine could outlast.
  await expect.poll(async () => (await position()).max, { timeout: 10_000 }).toBeGreaterThan(40);
  await expect
    .poll(
      async () => {
        const r = await position();
        return r.left >= r.max - 1;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
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
  const position = () =>
    scroller.evaluate((el) => ({ left: el.scrollLeft, max: el.scrollWidth - el.clientWidth }));
  await expect
    .poll(async () => {
      const r = await position();
      return r.max - r.left;
    })
    .toBeGreaterThan(20);
  // And it stays there: nothing snaps the grid back to its end once the dock has finished.
  await expect(page.locator("[data-panel]")).toHaveAttribute("data-panel", "open");
  const r = await position();
  expect(r.left).toBeLessThan(r.max - 20);
});
