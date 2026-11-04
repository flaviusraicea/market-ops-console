import { expect, test, type Page } from "@playwright/test";

import { answerComplete, ask } from "./helpers";

/**
 * Every `securitypolicyviolation` the page fires, recorded from the first script on. The event also covers
 * refusals the browser reports only as a DevTools Issue (an eval probe, for one), which never reach the console.
 * Locally /_vercel/speed-insights is a 404 that nosniff refuses as text/plain; that is not a policy event.
 */
async function recordViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (e) =>
      seen.push(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`),
    );
  });
  return () =>
    page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
}

test("pages send a nonce policy and the security headers, and nothing on the page breaks it", async ({
  page,
}) => {
  const violations = await recordViolations(page);
  const response = await page.goto("/?mode=analyst");
  const headers = response?.headers() ?? {};

  const policy = headers["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
  expect(nonce).toBeTruthy();
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).not.toContain("unsafe-eval");

  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");

  // Every inline script, the theme script and Next's own, carries this request's nonce.
  const inline = await page
    .locator("script:not([src])")
    .evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).nonce));
  expect(inline.length).toBeGreaterThan(0);
  for (const n of inline) expect(n).toBe(nonce);
  await expect(page.locator("html")).toHaveAttribute("data-density", "analyst");

  // The Analyst view loads lazy chunks and the map geometry; none of it is refused.
  await expect(page.getByRole("heading", { name: "By region" }).first()).toBeVisible();
  expect(await violations()).toEqual([]);

  // A streamed answer parses every event with zod: still nothing refused.
  await page.goto("/");
  await ask(page, "Why did Germany dip?");
  await answerComplete(page);
  expect(await violations()).toEqual([]);
});

test("scripts carry nosniff but not the document-only headers", async ({ page, request }) => {
  await page.goto("/?mode=executive");
  const src = await page.locator("script[src^='/_next/static']").first().getAttribute("src");
  const script = await request.get(src ?? "");
  expect(script.headers()["x-content-type-options"]).toBe("nosniff");
  expect(script.headers()["permissions-policy"]).toBeUndefined();
  expect(script.headers()["content-security-policy"]).toBeUndefined();
});

test("each page gets its own nonce", async ({ request }) => {
  const nonceOf = async () =>
    /'nonce-([^']+)'/.exec(
      (await request.get("/?mode=executive")).headers()["content-security-policy"] ?? "",
    )?.[1];
  expect(await nonceOf()).not.toBe(await nonceOf());
});
