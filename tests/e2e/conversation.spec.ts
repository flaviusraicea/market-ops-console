import { expect, test, type Page, type Route } from "@playwright/test";

import { answerComplete, ask, open } from "./helpers";

/** The conversation as a reader lives with it: the page holds still, answers say what they cover, and survive. */

const GERMANY = "/?mode=analyst&region=eu&market=de";
const CALYX = `${GERMANY}&product=calyx`;
const DIP = "Why did Germany's revenue dip?";

const panel = (page: Page) => page.locator("#assistant-panel");

/** Opens the assistant where the rail starts collapsed. */
async function openPanel(page: Page) {
  const toggle = page.getByRole("button", { name: "Open assistant" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByRole("textbox", { name: "Ask the assistant" }).waitFor();
}

/** Holds every /api/chat request until `release` is called, so an answer stays streaming as long as a test needs. */
async function holdChat(page: Page) {
  const held: Route[] = [];
  let holding = true;
  await page.route("**/api/chat", (route) => (holding ? void held.push(route) : route.continue()));
  return async () => {
    holding = false;
    await Promise.all(held.splice(0).map((r) => r.continue()));
  };
}

test.use({ viewport: { width: 1440, height: 900 } });

test("asking and streaming never scroll the page", async ({ page }) => {
  await open(page, GERMANY);
  await openPanel(page);
  await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
  const at = await page.evaluate(() => window.scrollY);
  expect(at).toBeGreaterThan(0);

  await page.getByRole("textbox", { name: "Ask the assistant" }).fill(DIP);
  // A real pointer at the button's place: Playwright's own click would scroll the target into view first.
  const send = await page.getByRole("button", { name: "Send" }).boundingBox();
  if (!send) throw new Error("Send is not rendered");
  await page.mouse.click(send.x + send.width / 2, send.y + send.height / 2);
  // Sample through the stream: the page must not move at any point, not only at the end.
  const samples: number[] = [];
  for (let i = 0; i < 20; i++) {
    samples.push(await page.evaluate(() => window.scrollY));
    await page.waitForTimeout(100);
  }
  await answerComplete(page);
  samples.push(await page.evaluate(() => window.scrollY));
  expect(new Set(samples)).toEqual(new Set([at]));
});

test("an answer about more than the product in view says what it covers", async ({ page }) => {
  await open(page, CALYX);
  await openPanel(page);
  await ask(page, DIP);
  await answerComplete(page);
  await expect(panel(page).getByText("Asked about Germany · Calyx · May 2026")).toBeVisible();
  await expect(panel(page).getByRole("note")).toHaveText(
    "Covers all products in Germany, not just Calyx",
  );
});

test("a reload keeps the conversation, and Retry asks about the view it was first asked from", async ({
  page,
}) => {
  await open(page, CALYX);
  await openPanel(page);
  await page.route("**/api/chat", (route) => route.abort());
  await ask(page, DIP);
  await expect(panel(page).getByText("Request failed · nothing was answered")).toBeVisible();
  await page.unroute("**/api/chat");

  // Back on the portfolio after a reload: the failed answer is still there, still about Germany · Calyx.
  await open(page, "/?mode=analyst");
  await openPanel(page);
  await expect(panel(page).getByText(DIP)).toBeVisible();
  const request = page.waitForRequest("**/api/chat");
  await panel(page).getByRole("button", { name: "Retry" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    question: DIP,
    context: { entity: { kind: "product", marketId: "de", productId: "calyx" } },
  });
  await answerComplete(page);
  await expect(panel(page).getByRole("note")).toHaveText(
    "Covers all products in Germany, not just Calyx",
  );
  // Retry replaced the failed answer in place: one question, one card.
  await expect(panel(page).getByText(DIP)).toHaveCount(1);
});

test("Retry from the keyboard keeps focus on the card's Stop/Retry button", async ({ page }) => {
  await open(page, GERMANY);
  await openPanel(page);
  const release = await holdChat(page);
  await ask(page, DIP);
  const stop = panel(page).getByRole("button", { name: "Stop generating" });
  await stop.focus();
  await page.keyboard.press("Enter");
  const retry = panel(page).getByRole("button", { name: "Retry" });
  await expect(retry).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(stop).toBeFocused();
  await release();
  await answerComplete(page);
});

test("Retry that fails again keeps focus on the card's Retry", async ({ page }) => {
  await open(page, GERMANY);
  await openPanel(page);
  await page.route("**/api/chat", (route) => route.abort());
  await ask(page, DIP);
  const retry = panel(page).getByRole("button", { name: "Retry" });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(panel(page).getByText("Request failed · nothing was answered")).toBeVisible();
  await expect(retry).toBeFocused();
  // And again: the reader can keep pressing Enter until the connection is back.
  await page.unroute("**/api/chat");
  await page.keyboard.press("Enter");
  await answerComplete(page);
});

test("signing out clears the conversation", async ({ page }) => {
  await open(page, GERMANY);
  await openPanel(page);
  await ask(page, DIP);
  await answerComplete(page);

  await page.getByRole("button", { name: /^Signed in as / }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  expect(await page.evaluate(() => window.sessionStorage.getItem("mo.conversation"))).toBeNull();

  await page.getByRole("button", { name: /Sam Okafor/ }).click();
  await page.getByRole("main").waitFor();
  await openPanel(page);
  await expect(panel(page).getByText(DIP)).toHaveCount(0);
});
