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
