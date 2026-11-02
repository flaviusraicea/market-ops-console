import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

async function germanyAnswer(page: Page) {
  await page.goto("/");
  await ask(page, "Why did Germany dip?");
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(3, {
    timeout: 5000,
  });
}

const march = (page: Page) =>
  page.getByRole("button", { name: "Go to Germany, Mar 2026 (largest dip)" });
const veltrix = (page: Page) =>
  page.getByRole("button", { name: "Go to Veltrix in Germany, Mar 2026" });

test("following the March chip puts Germany, March and the citation in the URL and presses the chip", async ({
  page,
}) => {
  await germanyAnswer(page);
  await march(page).click();
  await expect(page).toHaveURL(/market=de&period=2026-03&cite=1/);
  await expect(march(page)).toHaveAttribute("aria-pressed", "true");
  await expect(veltrix(page)).toHaveAttribute("aria-pressed", "false");
});

test("following the Veltrix chip adds the product to the URL", async ({ page }) => {
  await germanyAnswer(page);
  await march(page).click();
  await veltrix(page).click();
  await expect(page).toHaveURL(/product=veltrix/);
  await expect(page).toHaveURL(/cite=2/);
  await expect(veltrix(page)).toHaveAttribute("aria-pressed", "true");
  await expect(march(page)).toHaveAttribute("aria-pressed", "false");
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
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  }
});
