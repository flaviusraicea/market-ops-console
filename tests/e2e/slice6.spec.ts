import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ask, germanyAnswer, march, timeSeries } from "./helpers";

const veltrix = (page: Page) =>
  page.getByRole("button", { name: "Go to Veltrix in Germany, Mar 2026" });

test("following the March chip switches to Analyst and lands on the time series at March", async ({
  page,
}) => {
  await germanyAnswer(page);
  await expect(page).not.toHaveURL(/mode=analyst/);
  await march(page).click();
  await expect(page).toHaveURL(/market=de/);
  await expect(page).toHaveURL(/period=2026-03/);
  await expect(page).toHaveURL(/mode=analyst/);
  await expect(page).toHaveURL(/cite=1/);
  await expect(march(page)).toHaveAttribute("aria-pressed", "true");
  await expect(veltrix(page)).toHaveAttribute("aria-pressed", "false");

  const series = timeSeries(page);
  await expect(series).toHaveAttribute("data-landed", "");
  await expect(series.getByRole("tooltip")).toContainText("Mar 2026");
  await expect(series.getByRole("tooltip")).toContainText("Actual$1.21M");
  await expect(series).toBeInViewport();
  // The grid card rings too (a market target), and the ring ends after two seconds.
  await expect(page.getByRole("region", { name: /products/i }).first()).toHaveAttribute(
    "data-landed",
    "",
  );
  await expect(series).not.toHaveAttribute("data-landed", "", { timeout: 4000 });
  await expect(series.getByRole("tooltip")).toHaveCount(0);
});

test("following the Veltrix chip selects the Veltrix row and titles the chart Germany · Veltrix", async ({
  page,
}) => {
  await germanyAnswer(page);
  await march(page).click();
  await veltrix(page).click();
  await expect(page).toHaveURL(/product=veltrix/);
  await expect(page).toHaveURL(/cite=2/);
  await expect(veltrix(page)).toHaveAttribute("aria-pressed", "true");
  await expect(march(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { level: 3, name: /^Germany · Veltrix/ })).toBeVisible();
  const row = page.getByRole("row", { name: /Veltrix/ });
  await expect(row).toHaveAttribute("aria-current", "true");
  await expect(row).toHaveAttribute("data-landed", "");
});

test("an inline citation moves focus to its chip", async ({ page }) => {
  await germanyAnswer(page);
  await page.getByRole("link", { name: "steepest drop in March" }).click();
  await expect(march(page)).toBeFocused();
  // Moving focus does not navigate.
  await expect(page).not.toHaveURL(/cite=/);
});

test("Back after a followed chip removes cite and no chip is pressed", async ({ page }) => {
  await germanyAnswer(page);
  await march(page).click();
  await expect(page).toHaveURL(/cite=1/);
  await page.goBack();
  await expect(page).not.toHaveURL(/cite=/);
  await expect(page).not.toHaveURL(/mode=analyst/);
  await expect(
    page.getByRole("list", { name: "Citations" }).locator("[aria-pressed=true]"),
  ).toHaveCount(0);
});

test("a citation with an unknown market renders unresolved and cannot be followed", async ({
  page,
}) => {
  const body = [
    { type: "token", value: "Atlantis grew fast." },
    {
      type: "done",
      kind: "normal",
      confidence: "medium",
      citations: [{ marketId: "xx", period: "2026-03", label: "Atlantis, Mar 2026" }],
    },
  ]
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join("");
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 200, contentType: "text/event-stream", body }),
  );
  await page.goto("/");
  await ask(page, "Tell me about Atlantis");
  const chip = page.getByRole("button", { name: "Go to Atlantis, Mar 2026" });
  await expect(chip).toBeDisabled();
  await expect(chip).toHaveAccessibleDescription("Could not resolve this citation");
});

test("the answer with chips has no axe violations in light and dark", async ({ page }) => {
  await germanyAnswer(page);
  await march(page).click();
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    // Colours transition on a theme change; measure contrast once they have settled.
    await page.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a instanceof CSSTransition)
          .map((a) => a.finished),
      ),
    );
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
