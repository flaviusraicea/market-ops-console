import { expect, test, type Page } from "@playwright/test";

import { answerComplete, ask, boxOf, germanyAnswer, march, open, timeSeries } from "./helpers";

const box = (page: Page) => page.getByRole("textbox", { name: "Ask the assistant" });
const toggle = (page: Page) => page.getByRole("button", { name: /^(Open|Close) assistant$/ });

/**
 * The composer is one row when empty: as tall as a box holding one line of text, as tall as Send, and nothing in it
 * is clipped.
 */
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
  const send = (await boxOf(page.getByRole("button", { name: "Send" }))).height;
  expect(row.clip).toBeLessThanOrEqual(0);
  expect(row.empty).toBeLessThanOrEqual(row.oneLine + 0.5);
  expect(Math.abs(send - row.empty)).toBeLessThanOrEqual(0.5);
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
  const one = (await boxOf(box(page))).height;
  await box(page).fill("one\ntwo\nthree");
  const three = (await boxOf(box(page))).height;
  expect(three).toBeGreaterThan(one + 20);
  await box(page).fill("1\n2\n3\n4\n5\n6\n7\n8\n9\n10");
  const capped = (await boxOf(box(page))).height;
  expect(capped).toBeGreaterThan(three);
  expect(capped).toBeLessThanOrEqual(161);
  expect(await box(page).evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await box(page).fill("");
  await expectOneRow(page);
});

const series = timeSeries;

/** Counts scrollIntoView calls on landing targets, to prove a landing scrolls once. */
async function countLandingScrolls(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { landingScrolls: number };
    w.landingScrolls = 0;
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      if (this.hasAttribute("data-landing-target")) w.landingScrolls += 1;
      return original.apply(this, args as []);
    };
  });
}
const landingScrolls = (page: Page) =>
  page.evaluate(() => (window as unknown as { landingScrolls: number }).landingScrolls);

async function followMarchChip(page: Page) {
  await germanyAnswer(page);
  await march(page).click();
  await expect(series(page)).toHaveAttribute("data-landed", "");
}

test("the chart is in view after the landing, coming from Executive", async ({ page }) => {
  await followMarchChip(page);
  await expect
    .poll(async () => {
      const { y, height } = await boxOf(series(page));
      return y >= 0 && y + height <= (page.viewportSize()?.height ?? 0);
    })
    .toBe(true);
});

test("asking again after a followed chip clears cite and never lands or scrolls again", async ({
  page,
}) => {
  await countLandingScrolls(page);
  await followMarchChip(page);
  await expect(page).toHaveURL(/cite=1/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "", { timeout: 5000 });
  expect(await landingScrolls(page)).toBe(1);
  await ask(page, "Which markets are at risk?");
  await answerComplete(page);
  await expect(page).not.toHaveURL(/cite=/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "");
  await expect(page.locator('[aria-label="Citations"] [aria-pressed="true"]')).toHaveCount(0);
  expect(await landingScrolls(page)).toBe(1);
});

test("a question asked while the landing is still showing ends it without a second scroll", async ({
  page,
}) => {
  await countLandingScrolls(page);
  await followMarchChip(page);
  await ask(page, "Compare APAC and Europe");
  await expect(page).not.toHaveURL(/cite=/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "");
  expect(await landingScrolls(page)).toBe(1);
});

test("following the same chip again lands again", async ({ page }) => {
  await countLandingScrolls(page);
  await followMarchChip(page);
  await expect(series(page)).not.toHaveAttribute("data-landed", "", { timeout: 5000 });
  await march(page).click();
  await expect(series(page)).toHaveAttribute("data-landed", "");
  await expect.poll(() => landingScrolls(page)).toBe(2);
});

test("Back to an earlier chip of the same answer lands it", async ({ page }) => {
  await followMarchChip(page);
  await page.getByRole("button", { name: "Go to Veltrix in Germany, Mar 2026" }).click();
  await expect(page).toHaveURL(/cite=2/);
  await expect(series(page)).not.toHaveAttribute("data-landed", "", { timeout: 5000 });
  await page.goBack();
  await expect(page).toHaveURL(/cite=1/);
  await expect(march(page)).toHaveAttribute("aria-pressed", "true");
  await expect(series(page)).toHaveAttribute("data-landed", "");
});

test("the reader scrolling cancels the landing scroll, not the ring", async ({ page }) => {
  await countLandingScrolls(page);
  await germanyAnswer(page);
  await march(page).click();
  await expect(page).toHaveURL(/cite=1/);
  // The reader keeps scrolling while the page settles: wheel input reaches the landing before it scrolls.
  await page.evaluate(() => {
    const t = setInterval(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: 40 })), 10);
    setTimeout(() => clearInterval(t), 3000);
  });
  await expect(series(page)).toHaveAttribute("data-landed", "");
  expect(await landingScrolls(page)).toBe(0);
});

test("typing in the composer after a click does not cancel the landing scroll", async ({
  page,
}) => {
  await countLandingScrolls(page);
  await germanyAnswer(page);
  await march(page).click();
  await box(page).press("a");
  await expect(series(page)).toHaveAttribute("data-landed", "");
  expect(await landingScrolls(page)).toBe(1);
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
    const opacity = await series(page).evaluate((el) => getComputedStyle(el, "::after").opacity);
    expect(opacity).toBe("1");
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

test.describe("forced colours", () => {
  test.use({ forcedColors: "active" });
  test("a product row draws no ring until it lands", async ({ page }) => {
    await page.goto("/?mode=analyst&market=de");
    await page
      .getByRole("row", { name: /Veltrix/ })
      .first()
      .waitFor();
    const styles = await page
      .getByRole("row", { name: /Veltrix/ })
      .first()
      .evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(styles).toBe("none");
  });
});
