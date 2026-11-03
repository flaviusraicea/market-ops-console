import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
  return box;
}

test("the forecast-miss question shows the Low meter with its meaning", async ({ page }) => {
  await page.goto("/");
  await ask(page, "What is driving the portfolio's forecast miss?");
  const meter = page.getByRole("img", {
    name: "Low confidence: directional only, verify before acting",
  });
  await expect(meter).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(3);
});

test("an out-of-scope question abstains, and Try fills the composer without sending", async ({
  page,
}) => {
  await page.goto("/");
  await ask(page, "What will sales be next year?");
  const pill = page.getByText("Can’t answer from this data");
  await expect(pill).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("Data covers Jun 2024 to May 2026.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(0);

  await expect(
    page.getByRole("button", { name: "Try: “Which markets are at risk?”" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try: “Which markets are at risk?”" }).click();
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(box).toHaveValue("Which markets are at risk?");
  await expect(box).toBeFocused();
  await expect(page.locator('[data-slot="question-echo"]')).toHaveCount(1);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("force error shows the Request failed notice, and Retry re-sends", async ({ page }) => {
  await page.goto("/");
  await ask(page, "force error");
  const alert = page.getByRole("alert").filter({ hasText: "Request failed" });
  await expect(alert).toBeVisible({ timeout: 8000 });
  await expect(alert).toContainText("The assistant could not answer. Nothing was changed.");
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(0);

  await alert.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator('[data-slot="question-echo"]')).toHaveCount(2);
  await expect(page.getByRole("alert").filter({ hasText: "Request failed" })).toHaveCount(2, {
    timeout: 8000,
  });
});

test("an unmatched question renders the default low-confidence answer", async ({ page }) => {
  await page.goto("/");
  await ask(page, "hello");
  await expect(page.getByText(/I don't have enough in this dataset/)).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByRole("img", { name: /^Low confidence/ })).toBeVisible();
  await expect(page.getByText("Can’t answer from this data")).toHaveCount(0);
});

test("a stream that errors after two tokens keeps them marked partial, with the notice beneath", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: [
        'data: {"type":"token","value":"Germany fell "}\n\n',
        'data: {"type":"token","value":"sharply "}\n\n',
        'data: {"type":"error","message":"boom"}\n\n',
      ].join(""),
    }),
  );
  await page.goto("/");
  await ask(page, "Why did Germany dip?");
  await expect(page.getByText("Germany fell sharply")).toBeVisible();
  await expect(page.getByText("Failed · partial answer")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "Request failed" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" })).toHaveCount(0);
});
