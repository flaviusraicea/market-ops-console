import { expect, test } from "@playwright/test";

test("Ask why on Germany opens the panel, sends the question and keeps focus in the composer", async ({
  page,
}) => {
  await page.goto("/?mode=analyst&region=eu");
  await page.getByRole("button", { name: "Ask why Germany dipped" }).click();
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(box).toBeFocused();
  await expect(page.getByText("You asked, about Germany · May 2026:")).toBeVisible();
  await expect(page.getByText("Why did Germany's revenue dip?").first()).toBeVisible();
});

test("Enter in a prefilled composer sends it, labelled with where it was filled from", async ({
  page,
}) => {
  await page.goto("/?mode=analyst");
  await page.waitForLoadState("networkidle");
  await page.getByRole("gridcell", { name: /^Germany, Mar 2026/ }).focus();
  await page.keyboard.press("Shift+Enter");
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(box).toHaveValue("Why did Germany's revenue dip in Mar 2026?");
  await expect(page.getByText("You asked")).toHaveCount(0);
  await box.press("Enter");
  await expect(page.getByText("You asked, about Germany · Mar 2026:")).toBeVisible();
  await expect(page.getByRole("list", { name: "Citations" })).toBeVisible({ timeout: 8000 });
});

test("below 1024 px the panel scrolls into view", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 700 });
  await page.goto("/?mode=analyst&region=eu");
  await page.getByRole("button", { name: "Ask why Germany dipped" }).click();
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(box).toBeFocused();
  await expect(box).toBeInViewport();
});

test("Ask why on a grid row sends the status question", async ({ page }) => {
  await page.goto("/?mode=analyst&region=eu");
  await page.getByRole("button", { name: "Ask why Spain is off track" }).click();
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await expect(box).toBeFocused();
  await expect(page.getByText("You asked, about Spain · May 2026:")).toBeVisible();
  await expect(page.getByText("Why is Spain off track?").first()).toBeVisible();
});
