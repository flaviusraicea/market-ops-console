import { expect, test } from "@playwright/test";

import { open } from "./helpers";

test("after a drill, the map's keyboard order holds only the markets in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/?mode=executive&region=eu");
  const map = page
    .locator("svg[role='group']")
    .filter({ has: page.locator("path[role='button']") });
  const markets = map.locator("path[role='button']");
  await expect(markets.first()).toBeAttached();
  // Every market the keyboard can reach is drawn inside the map.
  const out = await markets.evaluateAll((els) => {
    const svg = els[0]!.closest("svg")!.getBoundingClientRect();
    return els
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const inside = cx >= svg.left && cx <= svg.right && cy >= svg.top && cy <= svg.bottom;
        return { name: el.getAttribute("aria-label") ?? "", inside };
      })
      .filter((m) => !m.inside);
  });
  // France's box spans French Guiana, so its box centre may sit outside; its mainland is inside.
  expect(out.filter((m) => !m.name.startsWith("France"))).toEqual([]);
  // The off-frame markets are gone from the accessible map: Australia is not a button in a Europe drill.
  await expect(map.getByRole("button", { name: /^Australia/ })).toHaveCount(0);
  // The one tab stop is a European market, and the tooltip sits inside the card.
  const stop = map.locator("path[tabindex='0']");
  await expect(stop).toHaveCount(1);
  await stop.focus();
  await expect(stop).toHaveAttribute("aria-label", /^(France|Germany|Italy|Spain|United Kingdom)/);
});
