import { expect, test } from "@playwright/test";

import { open } from "./helpers";

test("a drill never moves or zooms the map, and every market stays reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/?mode=executive");
  const map = page
    .locator("svg[role='group']")
    .filter({ has: page.locator("path[role='button']") });
  const markets = map.locator("path[role='button']");
  await expect(markets.first()).toBeAttached();
  // Centre of a market relative to the map, so page scroll and a selected market's thicker stroke do not count.
  const boxOf = async (name: RegExp) => {
    const [m, svg] = await Promise.all([
      map.getByRole("button", { name }).boundingBox(),
      map.boundingBox(),
    ]);
    return {
      x: Math.round(m!.x + m!.width / 2 - svg!.x),
      y: Math.round(m!.y + m!.height / 2 - svg!.y),
    };
  };
  const before = await boxOf(/^Germany/);

  // Clicking a market drills without changing the frame: same geometry, nothing zoomed.
  await map.getByRole("button", { name: /^Germany/ }).click();
  await expect(page).toHaveURL(/market=/);
  const after = await boxOf(/^Germany/);
  expect(after).toEqual(before);
  // A mouse click leaves no focus box behind: no native outline, no ring.
  await expect(map.locator("path[role='button']:focus")).toHaveCSS("outline-style", "none");

  // Wheel and double-click do nothing to the map either.
  const mapBox = (await map.boundingBox())!;
  await page.mouse.move(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  await page.mouse.wheel(0, -400);
  await page.mouse.dblclick(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  expect(await boxOf(/^Germany/)).toEqual(before);

  // A region drill dims the others but keeps all of them in the accessible map.
  await open(page, "/?mode=executive&region=eu");
  await expect(map.getByRole("button", { name: /^Australia/ })).toHaveCount(1);
  expect(await boxOf(/^Germany/)).toEqual(before);
  const stop = map.locator("path[tabindex='0']");
  await expect(stop).toHaveCount(1);
});
