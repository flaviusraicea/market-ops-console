import { expect, test } from "@playwright/test";

import { answerComplete, ask } from "./helpers";

// Prompts from the brief check that used to get a confident answer about the wrong time or the wrong thing.
const FUTURE = [
  "What will Germany's revenue be in 2027?",
  "Forecast Germany's revenue for 2027",
  "Will APAC keep outgrowing Europe next year?",
  "Which markets will be at risk next quarter?",
  "What will revenue be in Q3 2026?",
  "Project December 2026 revenue",
];

for (const question of FUTURE) {
  test(`a question about the future abstains: ${question}`, async ({ page }) => {
    await page.goto("/");
    await ask(page, question);
    await answerComplete(page);
    await expect(page.getByText("Can’t answer from this data")).toBeVisible();
    await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Citations" })).toHaveCount(0);
  });
}

test("Germany's answer is about the month asked, not the early-2026 story", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Why did Germany's revenue dip in September 2025?");
  await answerComplete(page);
  await expect(page.getByText("Germany's revenue in Sep 2025 was", { exact: false })).toBeVisible();
  await expect(page.getByText("steepest drop in March")).toHaveCount(0);
});

test("the at-risk answer counts the six flagged markets", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Which markets are at risk this quarter, and why?");
  await answerComplete(page);
  await expect(page.getByText("Six markets are flagged in the data.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(7);
});

test("the forecast-miss answer corrects its premise with the portfolio's attainment", async ({
  page,
}) => {
  await page.goto("/");
  await ask(page, "What's driving the portfolio's forecast miss?");
  await answerComplete(page);
  await expect(page.getByText("100.4% of forecast in May 2026", { exact: false })).toBeVisible();
});

test("a market the question names is not answered with another region's comparison", async ({
  page,
}) => {
  await page.goto("/");
  await ask(page, "Compare LATAM and APAC");
  await answerComplete(page);
  await expect(page.getByText("APAC is outgrowing Europe")).toHaveCount(0);
  // The fallback cites nothing, so it offers no sources to show.
  await expect(page.getByRole("button", { name: /Show sources/i })).toHaveCount(0);
});

test("a long answer reads as paragraphs", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Give me a full summary of the portfolio");
  await answerComplete(page);
  const card = page.locator('[data-slot="question-echo"]').locator("xpath=following-sibling::div");
  await expect(card.locator("p")).toHaveCount(5);
});
