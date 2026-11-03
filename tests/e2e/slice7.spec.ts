import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

async function atRiskAnswer(page: Page) {
  await page.goto("/");
  await ask(page, "Which markets are at risk this quarter and why?");
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(7, {
    timeout: 5000,
  });
}

test("exactly one chip carries the warning and says why", async ({ page }) => {
  await atRiskAnswer(page);
  const chips = page.getByRole("list", { name: "Citations" }).getByRole("button");
  await expect(chips.locator("svg.lucide-triangle-alert")).toHaveCount(1);
  const germany = page.getByRole("button", { name: "Go to Germany, latest period" });
  await expect(germany.locator("svg.lucide-triangle-alert")).toHaveCount(1);
  await expect(germany).toHaveAccessibleDescription(
    "Assistant says at risk; source data says off track",
  );
});

test("Show sources is open by default for this answer, with seven rows and the caption", async ({
  page,
}) => {
  await atRiskAnswer(page);
  const trigger = page.getByRole("button", { name: /Hide sources \(7\)/ });
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const region = page.getByRole("region", { name: "Sources table" });
  await expect(region.getByRole("row")).toHaveCount(8); // header + seven
  const first = region.getByRole("row").nth(1);
  await expect(first.locator("svg.lucide-triangle-alert")).toHaveCount(1);
  const assistant = first.getByRole("cell").last();
  await expect(assistant).toHaveText("At risk");
  await expect(assistant).toHaveClass(/text-warn-text/);
  await expect(page.getByText("Sources · data.json · attainment as given · derived")).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the sources table stays closed when nothing disagrees", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Why did Germany dip?");
  const trigger = page.getByRole("button", { name: /Show sources \(3\)/ });
  await expect(trigger).toBeVisible({ timeout: 5000 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(page.getByRole("region", { name: "Sources table" }).getByRole("row")).toHaveCount(4);
});

test("following the Germany chip shows Germany as Off track on the dashboard", async ({ page }) => {
  await atRiskAnswer(page);
  await page.getByRole("button", { name: "Go to Germany, latest period" }).click();
  await expect(page).toHaveURL(/market=de/);
  await expect(page.getByRole("main")).toContainText("Off track");
});
