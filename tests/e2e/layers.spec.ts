import { expect, test } from "@playwright/test";

// Elevation layers (design-system.md 3.1): a shadow is never the only edge. Forced-colors mode drops every
// box-shadow, so each layer must still draw its own 1 px border.
test.describe("elevation layers in forced colours", () => {
  test.use({ forcedColors: "active" });

  for (const [name, url] of [
    ["Executive", "/"],
    ["Analyst", "/?mode=analyst&region=eu&market=de"],
  ] as const) {
    test(`${name}: header, cards and the assistant panel keep a border`, async ({ page }) => {
      await page.goto(url);
      await page.locator("header").waitFor();
      const widths = await page.evaluate(() => {
        const bottom = (el: Element | null) =>
          el ? getComputedStyle(el).borderBottomWidth : "missing";
        return {
          header: bottom(document.querySelector("header")),
          card: bottom(document.querySelector(".layer-card")),
          panel: bottom(document.querySelector("#assistant-panel")),
        };
      });
      expect(widths).toEqual({ header: "1px", card: "1px", panel: "1px" });
    });
  }
});
