import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

test("the differs note leads the chip area and the sources table is open", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Which markets are at risk?", exact: true }).click();
  const area = page.locator('[data-slot="chip-area"]');
  await expect(area).toBeVisible({ timeout: 8000 });

  // Confidence sits in the card's first row, beside the AI label.
  const header = page.locator('[data-slot="card-header"]');
  await expect(header.getByText("AI-generated")).toBeVisible();
  await expect(
    header.getByRole("img", { name: "High confidence: directly supported by cited data" }),
  ).toBeVisible();

  // The note is the first thing after the answer text, a note and not a button.
  const note = area.getByRole("note").first();
  await expect(note).toHaveText("Differs from source: at risk here, off track in data.json");
  await expect(area.locator(":scope > *").first()).toHaveAttribute("role", "note");
  await expect(area.getByRole("list", { name: "Citations" }).getByRole("button")).toHaveCount(4);

  await expect(page.getByRole("button", { name: /Hide sources \(4\)/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(page.getByRole("list", { name: "Sources" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("the echo says where the question was asked", async ({ page }) => {
  await page.goto("/");
  await ask(page, "Which markets are at risk?");
  await expect(page.locator('[data-slot="question-echo"]')).toHaveText(
    "Asked about Portfolio · May 2026Which markets are at risk?",
  );
});

test("the empty state offers the three suggestions", async ({ page }) => {
  await page.goto("/");
  const rows = page.getByRole("list", { name: "Suggested questions" }).getByRole("button");
  await expect(rows).toHaveText([
    "Which markets are at risk?",
    "Why did Germany dip?",
    "Compare APAC and Europe",
  ]);
});

test("Compare APAC and Europe streams the APAC answer", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Compare APAC and Europe", exact: true }).click();
  await expect(page.getByRole("img", { name: /^High confidence|^Medium confidence/ })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.locator("p.font-display")).toContainText("APAC");
});

test("a typed out-of-scope question abstains", async ({ page }) => {
  await page.goto("/");
  await ask(page, "What will sales be next year?");
  await expect(page.getByText("Can’t answer from this data")).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /sources/i })).toHaveCount(0);
});
