import { expect, test, type Page } from "@playwright/test";

import { ANALYST_STATE, open } from "./helpers";

// The open Alerts section's code (the form, zod, TanStack Query) is a separate chunk that loads on intent. Until it
// attaches, the saved rules are listed and a placeholder holds the form's place. These tests hold or fail that
// chunk on purpose.

const URL = "/?mode=analyst";
const CHUNKS = "**/_next/static/chunks/**";

const section = (page: Page) => page.getByRole("region", { name: /^Alerts/ });
const trigger = (page: Page) => section(page).getByRole("button", { name: /^Alerts/ });
const form = (page: Page) => section(page).locator("form");
const placeholder = (page: Page) => section(page).getByText("Loading the alert editor…");

test.describe("as an Analyst", () => {
  test.use({ storageState: ANALYST_STATE });

  test("saved rules stay listed on every frame while the form attaches", async ({ page }) => {
    await page.addInitScript(() => {
      const rule = (id: string, metric: string, threshold: number) => ({
        id,
        metric,
        comparator: "below",
        threshold,
        scope: "portfolio",
      });
      window.localStorage.setItem(
        "market-ops:alerts:v1",
        JSON.stringify([rule("r1", "growth", -2), rule("r2", "attainment", 90)]),
      );
    });
    await open(page, URL);
    // One sample per frame from before the click until the form has attached.
    await page.evaluate(() => {
      const frames: { rows: number; empty: boolean }[] = [];
      Object.assign(window, { __alertFrames: frames });
      const tick = () => {
        const host = [...document.querySelectorAll("section")].find((s) =>
          s.querySelector("h3")?.textContent?.startsWith("Alerts"),
        );
        if (host?.querySelector('[aria-expanded="true"]')) {
          frames.push({
            rows: host.querySelectorAll("li").length,
            empty: host.textContent?.includes("No rules yet") ?? false,
          });
          if (host.querySelector("form") && frames.length > 3) return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await trigger(page).click();
    await expect(form(page)).toBeVisible();
    await expect(section(page).getByRole("listitem")).toHaveCount(2);
    const frames = await page.evaluate(
      () =>
        (window as unknown as { __alertFrames: { rows: number; empty: boolean }[] }).__alertFrames,
    );
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.filter((f) => f.empty)).toEqual([]);
    expect(frames.filter((f) => f.rows !== 2)).toEqual([]);
  });

  test("a chunk that fails to load says so, and Retry brings the form", async ({ page }) => {
    await open(page, URL);
    // Every chunk the page needs has loaded; from here on, only the Alerts code is requested.
    await page.route(CHUNKS, (route) => route.abort("internetdisconnected"));
    await trigger(page).click();

    const notice = section(page).getByRole("alert");
    await expect(notice).toContainText("Couldn’t load the alert editor");
    // Nothing is on its way any more: the placeholder is gone and there is no form yet.
    await expect(placeholder(page)).toHaveCount(0);
    await expect(form(page)).toHaveCount(0);

    await page.unroute(CHUNKS);
    await notice.getByRole("button", { name: "Retry" }).click();
    await expect(notice).toHaveCount(0);
    await expect(section(page).getByRole("textbox", { name: "Growth below" })).toBeEnabled();
  });
});

test("focus on Switch to Analyst survives the form attaching (Executive)", async ({ page }) => {
  await open(page, URL);
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route(CHUNKS, async (route) => {
    await held;
    await route.continue();
  });
  await trigger(page).click();
  await expect(placeholder(page)).toBeVisible();

  const switchButton = section(page).getByRole("button", { name: "Switch to Analyst" });
  await switchButton.focus();
  release();
  await expect(form(page)).toBeVisible();
  await expect(switchButton).toBeFocused();
});
