import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ask, open } from "./helpers";

test.use({ viewport: { width: 1440, height: 900 } });

const notice = (page: Page) => page.getByRole("status").filter({ hasText: "You’re offline" });

test("a drill while offline keeps the view and the conversation, and Retry completes it once back online", async ({
  page,
  context,
}) => {
  await open(page, "/");
  await ask(page, "Which markets are at risk?");
  await expect(page.getByText("Three markets stand out as at risk")).toBeVisible();
  const before = page.url();

  await context.setOffline(true);
  await page
    .getByRole("button", { name: /^Germany/ })
    .first()
    .click();
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("showing the last view");
  expect(page.url()).toBe(before);
  await expect(page.getByText("Three markets stand out as at risk")).toBeVisible();

  // Still offline: Retry says it is trying and the notice stays.
  await notice(page).getByRole("button", { name: "Retry" }).click();
  await expect(notice(page)).toBeVisible();

  await context.setOffline(false);
  await notice(page).getByRole("button", { name: "Retry" }).click();
  await expect(page).toHaveURL(/market=de/);
  await expect(notice(page)).toHaveCount(0);
  await expect(page.getByText("Three markets stand out as at risk")).toBeVisible();
});

test("a citation chip click while offline is held too, and Dismiss or Escape closes the notice", async ({
  page,
  context,
}) => {
  await open(page, "/");
  await ask(page, "Is Germany at risk?");
  const chip = page.getByRole("button", { name: /Germany/ }).last();
  await expect(chip).toBeVisible();
  const before = page.url();
  await context.setOffline(true);
  await chip.click();
  await expect(notice(page)).toBeVisible();
  expect(page.url()).toBe(before);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(notice(page)).toHaveCount(0);
  await context.setOffline(false);
});
