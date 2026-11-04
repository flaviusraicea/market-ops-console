import { expect, test, type Page } from "@playwright/test";

import { ANALYST_STATE, open } from "./helpers";

// The open Alerts section's code (the form, zod, TanStack Query) is a separate chunk that loads on intent. Until it
// attaches, a disabled shell stands in. These tests hold or fail that chunk on purpose.

const URL = "/?mode=analyst";
const CHUNKS = "**/_next/static/chunks/**";

const section = (page: Page) => page.getByRole("region", { name: /^Alerts/ });
const trigger = (page: Page) => section(page).getByRole("button", { name: /^Alerts/ });
const form = (page: Page) => section(page).locator("form");

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
    // One sample per frame from before the click until the form is no longer busy.
    await page.evaluate(() => {
      const frames: { height: number; empty: boolean }[] = [];
      Object.assign(window, { __alertFrames: frames });
      const tick = () => {
        const host = [...document.querySelectorAll("section")].find((s) =>
          s.querySelector("h3")?.textContent?.startsWith("Alerts"),
        );
        const form = host?.querySelector("form");
        if (host && form) {
          frames.push({
            // The body under the header: the open animation clips the section, not this.
            height: form.parentElement?.getBoundingClientRect().height ?? 0,
            empty: host.textContent?.includes("No rules yet") ?? false,
          });
          if (form.getAttribute("aria-busy") !== "true" && frames.length > 3) return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await trigger(page).click();
    await expect(form(page)).not.toHaveAttribute("aria-busy", "true");
    await expect(section(page).getByRole("listitem")).toHaveCount(2);
    const frames = await page.evaluate(
      () =>
        (window as unknown as { __alertFrames: { height: number; empty: boolean }[] })
          .__alertFrames,
    );
    expect(frames.length).toBeGreaterThan(0);
    expect(frames.filter((f) => f.empty)).toEqual([]);
    expect(new Set(frames.map((f) => Math.round(f.height))).size).toBe(1);
  });

  test("a chunk that fails to load says so, and Retry brings the form", async ({ page }) => {
    await open(page, URL);
    // Every chunk the page needs has loaded; from here on, only the Alerts code is requested.
    await page.route(CHUNKS, (route) => route.abort("internetdisconnected"));
    await trigger(page).click();

    const notice = section(page).getByRole("alert");
    await expect(notice).toContainText("Couldn’t load the alert editor");
    // Nothing is on its way any more, so the form is not busy, but its fields stay disabled.
    await expect(form(page)).not.toHaveAttribute("aria-busy", "true");
    await expect(section(page).getByRole("textbox", { name: "Growth below" })).toBeDisabled();

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
  await expect(form(page)).toHaveAttribute("aria-busy", "true");

  const switchButton = section(page).getByRole("button", { name: "Switch to Analyst" });
  await switchButton.focus();
  release();
  await expect(form(page)).not.toHaveAttribute("aria-busy", "true");
  await expect(switchButton).toBeFocused();
});
