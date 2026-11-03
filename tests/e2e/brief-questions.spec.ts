import { expect, test, type Page } from "@playwright/test";

// The brief's own wording, asked verbatim. If a sentence misses a fixture, extend the fixture keywords, never this test.
const BRIEF_QUESTIONS = [
  "Which markets are at risk this quarter, and why?",
  "Why did Germany's revenue dip in March 2026?",
  "Compare APAC and Europe on growth and forecast attainment",
  "What's driving the portfolio's forecast miss?",
];

async function ask(page: Page, question: string) {
  const box = page.getByRole("textbox", { name: "Ask the assistant" });
  await box.fill(question);
  await box.press("Enter");
}

async function expectGoodAnswer(page: Page) {
  await expect(page.getByRole("status")).toHaveText("Answer complete", { timeout: 15_000 });
  await expect(page.getByText("Can’t answer from this data")).toHaveCount(0);
  await expect(page.getByText("Can't answer from this data")).toHaveCount(0);
  await expect(page.getByText("Request failed")).toHaveCount(0);
  const chips = page
    .getByRole("list", { name: "Citations" })
    .getByRole("button", { name: /^Go to / });
  expect(await chips.count()).toBeGreaterThan(0);
  await expect(chips.first()).toBeEnabled();
}

for (const question of BRIEF_QUESTIONS) {
  test(`the brief's question gets a cited answer: ${question}`, async ({ page }) => {
    await page.goto("/");
    await ask(page, question);
    await expectGoodAnswer(page);
  });
}

test("no jank while streaming: frame gaps stay small and text updates are batched per frame", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "Headless chromium timing is the stable reference.");
  test.slow();
  await page.goto("/");
  await page.getByRole("textbox", { name: "Ask the assistant" }).waitFor();
  await page.evaluate(() => {
    const w = window as unknown as {
      __frameGaps: number[];
      __frames: number;
      __mutationBatches: number;
      __sampling: boolean;
    };
    w.__frameGaps = [];
    w.__frames = 0;
    w.__mutationBatches = 0;
    w.__sampling = true;
    let last = performance.now();
    const tick = (t: number) => {
      w.__frameGaps.push(t - last);
      w.__frames += 1;
      last = t;
      if (w.__sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const region = document.querySelector('[aria-label="Conversation"]') ?? document.body;
    new MutationObserver(() => {
      w.__mutationBatches += 1;
    }).observe(region, { subtree: true, childList: true, characterData: true });
  });

  await ask(page, BRIEF_QUESTIONS[1]!);
  await expectGoodAnswer(page);

  const { gaps, frames, batches } = await page.evaluate(() => {
    const w = window as unknown as {
      __frameGaps: number[];
      __frames: number;
      __mutationBatches: number;
      __sampling: boolean;
    };
    w.__sampling = false;
    return { gaps: w.__frameGaps.slice(1), frames: w.__frames, batches: w.__mutationBatches };
  });
  const sorted = [...gaps].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!;
  const max = sorted[sorted.length - 1]!;
  expect(gaps.length).toBeGreaterThan(30);
  expect(p95, `p95 frame gap ${p95.toFixed(1)} ms`).toBeLessThanOrEqual(50);
  expect(max, `max frame gap ${max.toFixed(1)} ms`).toBeLessThanOrEqual(100);
  expect(batches, `${batches} DOM mutation batches over ${frames} frames`).toBeLessThanOrEqual(
    frames + 2,
  );
});
