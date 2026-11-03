import { expect, test } from "@playwright/test";

import { answerComplete, ask } from "./helpers";

// The brief: "no jank while streaming". Runs in its own Playwright project, alone after the rest of the suite,
// so other tests cannot steal CPU and stretch a frame (see playwright.config.ts). Token batching itself is
// unit-tested in tests/unit/tokenBatching.test.tsx.
declare global {
  interface Window {
    __frameGaps: number[];
    __sampling: boolean;
  }
}

test("no jank while streaming: the 95th percentile frame gap is under 50 ms and none passes 100 ms", async ({
  page,
}) => {
  test.slow();
  await page.goto("/");
  await page.getByRole("textbox", { name: "Ask the assistant" }).waitFor();
  await page.evaluate(() => {
    window.__frameGaps = [];
    window.__sampling = true;
    let last = performance.now();
    const tick = (t: number) => {
      window.__frameGaps.push(t - last);
      last = t;
      if (window.__sampling) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await ask(page, "Why did Germany's revenue dip in March 2026?");
  await answerComplete(page);

  const gaps = await page.evaluate(() => {
    window.__sampling = false;
    return window.__frameGaps.slice(1);
  });
  expect(gaps.length).toBeGreaterThan(30);
  const sorted = [...gaps].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? Infinity;
  const max = sorted.at(-1) ?? Infinity;
  expect(p95, `p95 frame gap ${p95.toFixed(1)} ms over ${gaps.length} frames`).toBeLessThanOrEqual(
    50,
  );
  expect(max, `max frame gap ${max.toFixed(1)} ms`).toBeLessThanOrEqual(100);
});
