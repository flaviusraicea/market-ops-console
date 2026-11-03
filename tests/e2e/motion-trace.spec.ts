import { expect, test, type CDPSession, type Page } from "@playwright/test";

import {
  answerComplete,
  ask,
  germanyAnswer,
  march,
  open,
  sampleFrames,
  timeSeries,
  trackShifts,
} from "./helpers";

// Motion spec section 4: a Chrome trace and a frame sampler around each moving part of the console. Runs in the
// jank project (alone, no retries) so other tests cannot steal CPU and stretch a frame. A long task is any
// RunTask over 50 ms; a frame is the gap between two animation frames. Layout shifts are summed per step.
//
// Thresholds: no long task anywhere, no frame past three vsyncs (50 ms), and no layout shift while hovering,
// moving the rail or opening the palette. Following a citation switches view: it is gated only at 100 ms and its
// slowest frame is reported. A last test sweeps the DOM for transitions on layout properties.

type Measure = { name: string; maxFrame: number; longTasks: number[]; shift: number };
const measures: Measure[] = [];

async function measure(
  cdp: CDPSession,
  page: Page,
  shiftSoFar: () => Promise<number>,
  name: string,
  act: () => Promise<void>,
) {
  const events: Array<Record<string, unknown>> = [];
  const collect = (e: { value: Array<Record<string, unknown>> }) => void events.push(...e.value);
  cdp.on("Tracing.dataCollected", collect);
  await cdp.send("Tracing.start", {
    categories: "devtools.timeline,toplevel",
    transferMode: "ReportEvents",
  });
  const before = await shiftSoFar();
  const stopSampling = await sampleFrames(page);
  await act();
  const gaps = await stopSampling();
  const shift = await shiftSoFar();
  const complete = new Promise((resolve) => cdp.once("Tracing.tracingComplete", resolve));
  await cdp.send("Tracing.end");
  await complete;
  cdp.off("Tracing.dataCollected", collect);
  const result: Measure = {
    name,
    maxFrame: Math.max(0, ...gaps),
    longTasks: events
      .filter((e) => e["name"] === "RunTask" && e["ph"] === "X" && Number(e["dur"] ?? 0) > 50_000)
      .map((e) => Math.round(Number(e["dur"]) / 1000)),
    shift: shift - before,
  };
  measures.push(result);
  return result;
}

/** Waits until every finite animation on the page has finished (looping ones, such as shimmer, never do). */
const settled = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined)),
    ),
  );

test.describe("motion trace", () => {
  test.slow();

  test.afterAll(() => {
    for (const m of measures) {
      console.log(
        `${m.name}: slowest frame ${m.maxFrame.toFixed(1)} ms, long tasks ${m.longTasks.join(",") || "none"}, layout shift ${m.shift.toFixed(4)}`,
      );
    }
  });

  test("hovering, the rail, the palette and streaming stay inside the frame budget", async ({
    page,
  }) => {
    const shiftSoFar = await trackShifts(page);
    await open(page, "/");
    const cdp = await page.context().newCDPSession(page);

    const regions = await measure(cdp, page, shiftSoFar, "hover By region rows", async () => {
      const rows = page.getByRole("region", { name: "By region" }).locator("li");
      for (let i = 0; i < Math.min(6, await rows.count()); i++) {
        await rows.nth(i).hover();
        await settled(page);
      }
    });
    expect(regions.longTasks).toEqual([]);
    expect(regions.maxFrame).toBeLessThanOrEqual(50);
    expect(regions.shift).toBe(0);

    const rail = await measure(cdp, page, shiftSoFar, "assistant rail open and close", async () => {
      for (let i = 0; i < 2; i++) {
        await page.getByRole("button", { name: "Collapse assistant" }).click();
        await expect(page.getByRole("button", { name: "Open assistant" })).toBeVisible();
        await settled(page);
        await page.getByRole("button", { name: "Open assistant" }).click();
        await expect(page.getByRole("button", { name: "Collapse assistant" })).toBeVisible();
        await settled(page);
      }
    });
    expect(rail.longTasks).toEqual([]);
    expect(rail.maxFrame).toBeLessThanOrEqual(50);
    expect(rail.shift).toBe(0);

    const palette = await measure(cdp, page, shiftSoFar, "palette open and close", async () => {
      for (let i = 0; i < 2; i++) {
        await page.keyboard.press("Control+k");
        const dialog = page.getByRole("dialog", { name: "Command palette" });
        await expect(dialog).toBeVisible();
        await settled(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      }
    });
    expect(palette.longTasks).toEqual([]);
    expect(palette.maxFrame).toBeLessThanOrEqual(50);
    expect(palette.shift).toBe(0);

    const stream = await measure(cdp, page, shiftSoFar, "stream the Germany answer", async () => {
      await ask(page, "Why did Germany dip?");
      await answerComplete(page);
    });
    expect(stream.longTasks).toEqual([]);
    expect(stream.maxFrame).toBeLessThanOrEqual(50);
    // The status slot is fixed, so only the caret's sub-pixel steps remain.
    expect(stream.shift).toBeLessThan(0.001);
  });

  test("hovering heat-map cells moves the tooltip without a layout pass", async ({ page }) => {
    const shiftSoFar = await trackShifts(page);
    await open(page, "/?mode=analyst&region=eu");
    const cdp = await page.context().newCDPSession(page);
    const cells = page.getByRole("gridcell");
    const total = await cells.count();
    const heat = await measure(cdp, page, shiftSoFar, "hover heat-map cells", async () => {
      for (let i = 0; i < 6; i++) {
        await cells.nth(Math.floor((i * total) / 6)).hover();
        await expect(page.getByRole("tooltip")).toBeVisible();
        await settled(page);
      }
    });
    expect(heat.longTasks).toEqual([]);
    expect(heat.maxFrame).toBeLessThanOrEqual(50);
    // The tooltip's own text swaps size a little as it follows the pointer; the box itself never reflows.
    expect(heat.shift).toBeLessThan(0.01);
  });

  test("following a citation scrolls to the chart and shows the ring without a long task", async ({
    page,
  }) => {
    const shiftSoFar = await trackShifts(page);
    await germanyAnswer(page);
    const cdp = await page.context().newCDPSession(page);
    const follow = await measure(cdp, page, shiftSoFar, "follow a citation", async () => {
      await march(page).click();
      await expect(timeSeries(page)).toHaveAttribute("data-landed", "");
      await settled(page);
    });
    expect(follow.longTasks).toEqual([]);
    expect(follow.maxFrame).toBeLessThanOrEqual(100);
    expect(follow.shift).toBeLessThan(0.002);
  });

  for (const url of ["/", "/?mode=analyst&region=eu"]) {
    test(`no element transitions a layout property (${url})`, async ({ page }) => {
      await open(page, url);
      const offenders = await page.evaluate(() => {
        const layout =
          /^(all|width|height|top|left|right|bottom|margin.*|padding.*|grid-template-.*)$/;
        const list = (value: string) => value.split(",").map((part) => part.trim());
        const found: string[] = [];
        for (const el of document.querySelectorAll("*")) {
          const style = getComputedStyle(el);
          const properties = list(style.transitionProperty);
          const durations = list(style.transitionDuration);
          properties.forEach((property, i) => {
            const duration = parseFloat(durations[i % durations.length] ?? "0");
            if (duration > 0 && layout.test(property))
              found.push(`${el.tagName.toLowerCase()} ${property}`);
          });
        }
        return found;
      });
      expect(offenders).toEqual([]);
    });
  }
});
