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
