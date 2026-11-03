import { expect, type Page } from "@playwright/test";

/** Types a question into the assistant composer and sends it. */
export async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

/** Waits for the screen-reader status that closes every finished answer. */
export async function answerComplete(page: Page) {
  await expect(page.getByRole("status")).toHaveText("Answer complete", { timeout: 15_000 });
}
