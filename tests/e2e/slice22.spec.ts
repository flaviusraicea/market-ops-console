import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { answerComplete, ask, open } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 } });

const citations = (page: Page) =>
  page.getByRole("list", { name: "Citations" }).getByRole("button", { name: /^Go to / });

test("at Europe scope, the at-risk answer is about European markets only", async ({ page }) => {
  await page.goto("/?region=eu");
  await ask(page, "Which markets are at risk?");
  await answerComplete(page);

  await expect(page.locator('[data-slot="question-echo"]')).toHaveText(
    "You asked, about Europe · May 2026:Which markets are at risk?",
  );
  await expect(citations(page)).toHaveText([
    "Germany, latest period",
    "Spain, latest period",
    "Italy, latest period",
    "United Kingdom, latest period",
    "France, latest period",
  ]);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("at portfolio scope, the same question still gets the portfolio answer", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Which markets are at risk?");
  await answerComplete(page);
  await expect(citations(page)).toHaveText([
    "Germany, latest period",
    "Germany, March dip",
    "Italy, latest period",
    "Brazil, latest period",
  ]);
});

test("in Germany in March, 'Why did revenue dip?' is answered from that month's numbers", async ({
  page,
}) => {
  await open(page, "/?mode=analyst&market=de&period=2026-03");
  await page.getByRole("button", { name: /^Open assistant$/ }).click();
  await ask(page, "Why did revenue dip?");
  await answerComplete(page);

  await expect(page.locator('[data-slot="question-echo"]')).toHaveText(
    "You asked, about Germany · Mar 2026:Why did revenue dip?",
  );
  await expect(
    page.getByText(
      "Germany's revenue in Mar 2026 was $1.21M against a $1.31M forecast, 92.2% attainment; −27.2% on the previous month.",
    ),
  ).toBeVisible();
  await expect(citations(page)).toHaveText(["Germany, Mar 2026", "Germany, Feb 2026"]);

  // The chip lands on the chart at the cited month.
  await page.getByRole("button", { name: "Go to Germany, Mar 2026" }).click();
  const series = page.getByRole("region", { name: /revenue Actual vs forecast/ });
  await expect(series).toHaveAttribute("data-landed", "");
  await expect(series.getByRole("tooltip")).toContainText("Mar 2026");
  await expect(series.getByRole("tooltip")).toContainText("Actual$1.21M");
});

test("Ask why on a France row in the Overview answers about France", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Ask why.*France/ })
    .first()
    .click();
  await answerComplete(page);
  await expect(page.locator('[data-slot="question-echo"]')).toHaveText(
    "You asked, about France · May 2026:Why is France at risk?",
  );
  // The data records France's status but not why, so the assistant says so instead of restating figures.
  await expect(page.getByText(/^I can't say why France is at risk\. /)).toBeVisible();
  await expect(page.getByText("Can’t answer from this data")).toBeVisible();
});
