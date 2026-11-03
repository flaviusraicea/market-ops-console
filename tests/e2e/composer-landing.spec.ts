import { expect, test, type Page } from "@playwright/test";

import { answerComplete, ask, open } from "./helpers";

const box = (page: Page) => page.getByRole("textbox", { name: "Ask the assistant" });
const toggle = (page: Page) => page.getByRole("button", { name: /^(Open|Close) assistant$/ });

/** The composer is one row when empty: as tall as a box holding one line of text, and nothing in it is clipped. */
async function expectOneRow(page: Page) {
  await expect(box(page)).toBeVisible();
  const row = await box(page).evaluate((el) => {
    const empty = el.getBoundingClientRect().height;
    const clip = el.scrollHeight - el.clientHeight;
    const text = (el as HTMLTextAreaElement).value;
    (el as HTMLTextAreaElement).value = "x";
    const oneLine = el.getBoundingClientRect().height;
    (el as HTMLTextAreaElement).value = text;
    return { empty, oneLine, clip };
  });
  expect(row.clip).toBeLessThanOrEqual(0);
  expect(row.empty).toBeLessThanOrEqual(row.oneLine + 0.5);
}

for (const width of [1280, 1440]) {
  test.describe(`composer at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("is one row when empty, in Executive, Analyst, and after the rail reopens", async ({
      page,
    }) => {
      await open(page, "/");
      await expect(box(page)).toHaveAttribute("placeholder", "Ask about a market or period…");
      await expectOneRow(page);

      // Analyst starts with the rail collapsed: the composer mounts hidden and must size itself when it opens.
      await open(page, "/?mode=analyst");
      await toggle(page).click();
      await expectOneRow(page);

      await page.getByRole("button", { name: "Collapse assistant" }).click();
      await expect(page.locator("#assistant-panel")).toBeHidden();
      await toggle(page).click();
      await expectOneRow(page);

      // Back to Executive: the composer mounted hidden while Analyst was shown must not keep a stale height.
      await open(page, "/");
      await expectOneRow(page);
    });
  });
}

test("grows with a pasted multi-line question, caps at four rows, and shrinks back", async ({
  page,
}) => {
  await open(page, "/");
  const one = (await box(page).boundingBox())?.height ?? 0;
  await box(page).fill("one\ntwo\nthree");
  const three = (await box(page).boundingBox())?.height ?? 0;
  expect(three).toBeGreaterThan(one + 20);
  await box(page).fill("1\n2\n3\n4\n5\n6\n7\n8");
  const capped = (await box(page).boundingBox())?.height ?? 0;
  expect(capped).toBeGreaterThan(three);
  expect(capped).toBeLessThanOrEqual(161);
  expect(await box(page).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await box(page).fill("");
  await expectOneRow(page);
});

const march = (page: Page) =>
  page.getByRole("button", { name: "Go to Germany, Mar 2026 (largest dip)" });
const series = (page: Page) => page.getByRole("region", { name: /revenue Actual vs forecast/ });

async function followMarchChip(page: Page) {
  await open(page, "/");
  await ask(page, "Why did Germany dip?");
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(3);
  await march(page).click();
  await expect(series(page)).toHaveAttribute("data-landed", "");
}

test("asking again after a followed chip clears cite and never lands the old chip", async ({
  page,
}) => {
  await followMarchChip(page);
  await expect(page).toHaveURL(/cite=1/);
  // Let the landing finish, then ask something else.
  await expect(series(page)).not.toHaveAttribute("data-landed", "", { timeout: 5000 });
  await ask(page, "Which markets are at risk?");
  await answerComplete(page);
  await expect(page).not.toHaveURL(/cite=/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "");
  // The new answer's chips are not pressed.
  await expect(page.locator('[aria-label="Citations"] [aria-pressed="true"]')).toHaveCount(0);
});

test("a question asked while the landing is still showing ends it without a second scroll", async ({
  page,
}) => {
  await followMarchChip(page);
  await ask(page, "Compare APAC and Europe");
  await expect(page).not.toHaveURL(/cite=/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "");
});

test("the reader scrolling cancels the landing scroll", async ({ page }) => {
  await open(page, "/");
  await ask(page, "Why did Germany dip?");
  await expect(page.getByRole("list", { name: "Citations" }).getByRole("listitem")).toHaveCount(3);
  await march(page).click();
  // Wheel before the layout has settled: the page stays where the reader put it.
  await page.mouse.wheel(0, 3000);
  const y = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(0);
  await expect(series(page)).toHaveAttribute("data-landed", "");
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 1500 })
    .toBeGreaterThanOrEqual(y - 2);
});

test("the landing shows a ring and a tint on an overlay, then leaves", async ({ page }) => {
  await followMarchChip(page);
  const overlay = () =>
    series(page).evaluate((el) => {
      const s = getComputedStyle(el, "::after");
      return { opacity: s.opacity, background: s.backgroundColor, outline: s.outlineStyle };
    });
  await expect.poll(async () => (await overlay()).opacity).toBe("1");
  const shown = await overlay();
  expect(shown.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(shown.outline).toBe("solid");
  await expect(series(page)).not.toHaveAttribute("data-landed", "", { timeout: 5000 });
  await expect.poll(async () => (await overlay()).opacity).toBe("0");
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("the ring shows for the hold with no animations running", async ({ page }) => {
    await followMarchChip(page);
    await expect(series(page)).toHaveCSS("outline-color", /rgb\(/);
    expect(
      await page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (a) =>
                a.effect instanceof KeyframeEffect &&
                (a.effect.target as Element | null)?.hasAttribute("data-landing-target"),
            ).length,
      ),
    ).toBe(0);
  });
});
