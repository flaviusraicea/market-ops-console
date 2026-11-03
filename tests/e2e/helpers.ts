import { expect, type Locator, type Page } from "@playwright/test";

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
