import { expect, type Locator, type Page, type devices } from "@playwright/test";

/**
 * A browser that is already signed in as the Analyst, for tests that edit alert rules. A fresh context is signed in
 * as the Executive (the proxy sets that cookie on the first visit), who reads rules but cannot change them.
 */
export const ANALYST_STATE = {
  cookies: [
    {
      name: "market-ops-role",
      value: "analyst",
      domain: "localhost",
      path: "/",
      expires: -1,
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ],
  origins: [],
};

/** Types a question into the assistant composer and sends it. */
export async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

/** Loads a page and waits for it to be interactive: clicks before hydration do nothing. */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
  await page.getByRole("main").waitFor();
  if (url.includes("analyst")) await page.getByRole("gridcell").first().waitFor();
}

/** A locator's bounding box, failing with a message instead of returning null. */
export async function boxOf(target: Locator) {
  const box = await target.boundingBox();
  if (!box) throw new Error("Element has no bounding box (not rendered?)");
  return box;
}

/** Waits for the screen-reader status that closes every finished answer. */
export async function answerComplete(page: Page) {
  await expect(page.getByRole("status")).toHaveText("Answer complete", { timeout: 15_000 });
}

/**
 * A device profile for the Chromium suite: the profiles bring their own browser (WebKit), so keep the viewport, the
 * touch input and the user agent and drop the browser type.
 */
export function onChromium(profile: (typeof devices)[string]) {
  const { defaultBrowserType, ...rest } = profile;
  void defaultBrowserType;
  return rest;
}

/** The Germany answer's chip for the March dip. */
export const march = (page: Page) =>
  page.getByRole("button", { name: "Go to Germany, Mar 2026 (largest dip)" });

/** The Analyst time series card, the target of a followed citation. */
export const timeSeries = (page: Page) =>
  page.getByRole("region", { name: /revenue Actual vs forecast/ });

/** Asks about Germany's dip and waits for the answer's three chips. */
export async function germanyAnswer(page: Page) {
  await page.goto("/");
  await ask(page, "Why did Germany dip?");
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(3, {
    timeout: 5000,
  });
}

declare global {
  interface Window {
    __shift: number;
    __frameGaps: number[];
    __sampling: boolean;
  }
}

/** Sums layout-shift entries (without recent input) from before the first paint. Returns a reader for the total. */
export async function trackShifts(page: Page) {
  await page.addInitScript(() => {
    window.__shift = 0;
    new PerformanceObserver((list) => {
      // lib.dom has no LayoutShift type, so the entries are read through the shape the spec gives them.
      for (const entry of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>)
        if (!entry.hadRecentInput) window.__shift += entry.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  return () => page.evaluate(() => window.__shift);
}

/** Starts sampling the gap between animation frames. Returns a function that stops it and gives the gaps in ms. */
export async function sampleFrames(page: Page) {
  await page.evaluate(() => {
    window.__frameGaps = [];
    window.__sampling = true;
    let last = performance.now();
    const tick = (t: number) => {
      window.__frameGaps.push(t - last);
      last = t;
      if (window.__sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return () =>
    page.evaluate(() => {
      window.__sampling = false;
      return window.__frameGaps.slice(1);
    });
}
