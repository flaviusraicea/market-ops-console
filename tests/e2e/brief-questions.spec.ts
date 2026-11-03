import { expect, test } from "@playwright/test";

import { answerComplete, ask } from "./helpers";

// The brief's own wording, asked verbatim. If a sentence misses a fixture, extend the fixture keywords, never this test.
export const BRIEF_QUESTIONS = [
  "Which markets are at risk this quarter, and why?",
  "Why did Germany's revenue dip in March 2026?",
  "Compare APAC and Europe on growth and forecast attainment",
  "What's driving the portfolio's forecast miss?",
] as const;

for (const question of BRIEF_QUESTIONS) {
  test(`the brief's question gets a cited answer: ${question}`, async ({ page }) => {
    await page.goto("/");
    await ask(page, question);
    await answerComplete(page);
    // Not an abstain (its pill) and not an error (its notice).
    await expect(page.getByText("Can’t answer from this data")).toHaveCount(0);
    await expect(page.getByText("Request failed")).toHaveCount(0);
    const chips = page
      .getByRole("list", { name: "Citations" })
      .getByRole("button", { name: /^Go to / });
    expect(await chips.count()).toBeGreaterThan(0);
    await expect(chips.first()).toBeEnabled();
  });
}
