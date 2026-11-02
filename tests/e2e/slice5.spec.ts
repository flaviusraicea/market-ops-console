import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const GERMANY = "Why did Germany dip?";

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
  return box;
}

test("the Germany answer streams, then shows three citations and a High confidence meter", async ({
  page,
}) => {
  await page.goto("/");
  await ask(page, GERMANY);
  await expect(page.getByText("STREAMING…")).toBeVisible();
  await expect(page.locator(".caret")).toBeVisible();
  await expect
    .poll(
      async () => (await page.getByRole("region", { name: "Conversation" }).textContent()) ?? "",
      {
        timeout: 5000,
      },
    )
    .toContain("steepest drop in March");

  const chips = page.getByRole("list", { name: "Citations" }).getByRole("listitem");
  await expect(chips).toHaveCount(3, { timeout: 5000 });
  await expect(chips).toHaveText([
    "Germany, Feb 2026",
    "Germany, Mar 2026 (largest dip)",
    "Veltrix in Germany, Mar 2026",
  ]);
  await expect(page.getByRole("img", { name: /^High confidence/ })).toBeVisible();
  await expect(page.locator(".caret")).toHaveCount(0);
  await expect(page.getByText("STREAMING…")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Answer complete");
});

test("Stop keeps the partial text with a pill and no chips or meter, then Retry re-asks", async ({
  page,
}) => {
  await page.goto("/");
  await ask(page, GERMANY);
  const stop = page.getByRole("button", { name: "Stop" });
  await expect(stop).toBeVisible();
  await expect
    .poll(async () => (await page.locator("p.font-display").first().textContent())?.length ?? 0)
    .toBeGreaterThan(10);
  await stop.click();

  await expect(page.getByText("Stopped · partial answer")).toBeVisible();
  await expect(page.getByText("PARTIAL · NO SOURCES ATTACHED")).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(0);
  await expect(page.locator(".caret")).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("Answer stopped");
  // Stop turns into Retry on the same button, so focus stays on it.
  await expect(page.getByRole("button", { name: "Retry" })).toBeFocused();

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator('[data-slot="question-echo"]')).toHaveCount(2);
  await expect(page.getByText("Stopped · partial answer")).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Citations" })).toHaveCount(1, { timeout: 5000 });
});

test("asking twice keeps both echoes in order and the composer focused", async ({ page }) => {
  await page.goto("/");
  const box = await ask(page, GERMANY);
  await expect(box).toBeFocused();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  await expect(page.getByRole("img", { name: /^High confidence/ })).toBeVisible({ timeout: 5000 });
  await expect(box).toBeFocused();

  await ask(page, "Which markets are at risk?");
  await expect(box).toBeFocused();
  await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(2, { timeout: 5000 });
  const echoes = page.locator('[data-slot="question-echo"]');
  await expect(echoes).toHaveText([
    `You asked, about Portfolio · May 2026:${GERMANY}`,
    "You asked, about Portfolio · May 2026:Which markets are at risk?",
  ]);
  await expect(box).toBeFocused();
});

test("a suggestion fills and sends", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: GERMANY, exact: true }).click();
  await expect(page.locator('[data-slot="question-echo"]')).toContainText(GERMANY);
  await expect(page.getByRole("textbox", { name: "Ask the assistant" })).toBeFocused();
  await expect(page.getByRole("img", { name: /^High confidence/ })).toBeVisible({ timeout: 5000 });
});

test("the forced error fixture shows the failure notice and Retry", async ({ page }) => {
  await page.goto("/");
  await ask(page, "force error");
  await expect(page.getByRole("alert").filter({ hasText: "Request failed" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Answer failed");
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("desktop: the panel is sticky, only the list scrolls, and New text appears when scrolled away", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto("/");
  const panel = page.locator('aside[aria-labelledby="assistant-h"] > div');
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  for (let i = 0; i < 3; i++) {
    await ask(page, "Give me a full summary");
    await expect(page.getByRole("img", { name: /confidence/i })).toHaveCount(i + 1, {
      timeout: 8000,
    });
  }
  const region = page.getByRole("region", { name: "Conversation" });
  const overflow = await region.evaluate((el) => ({
    scrolls: el.scrollHeight > el.clientHeight,
    panelH: el.closest("aside")!.firstElementChild!.nextElementSibling!.getBoundingClientRect()
      .height,
  }));
  expect(overflow.scrolls).toBe(true);
  expect(overflow.panelH).toBeLessThanOrEqual(640 - 56 - 32 + 1);
  // The composer stays in view while the page is scrolled.
  await page.mouse.wheel(0, 400);
  await expect(box).toBeInViewport();
  await expect(panel).toBeInViewport();

  // Asking scrolls the new card into view; scrolling away mid-stream stops following and offers "New text".
  await ask(page, "Give me a full summary");
  await expect(page.getByText("STREAMING…")).toBeVisible();
  await page.waitForTimeout(800);
  await region.evaluate((el) => (el.scrollTop = 0));
  const newText = page.getByRole("button", { name: "Scroll to newest answer" });
  await expect(newText).toBeVisible();
  await expect.poll(() => region.evaluate((el) => el.scrollTop)).toBe(0);
  await newText.click();
  await expect(newText).toHaveCount(0);
  await expect
    .poll(() => region.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop))
    .toBeLessThan(48);
});

test("axe finds no violations with an answer on screen", async ({ page }) => {
  await page.goto("/");
  await ask(page, GERMANY);
  await expect(page.getByRole("img", { name: /^High confidence/ })).toBeVisible({ timeout: 5000 });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
