import { expect, test } from "@playwright/test";

test("pages send a nonce policy and the security headers, and nothing on the page breaks it", async ({
  page,
}) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/.test(m.text())) violations.push(m.text());
  });
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
  expect(violations).toEqual([]);
});

test("each page gets its own nonce", async ({ request }) => {
  const nonceOf = async () =>
    /'nonce-([^']+)'/.exec(
      (await request.get("/?mode=executive")).headers()["content-security-policy"] ?? "",
    )?.[1];
  expect(await nonceOf()).not.toBe(await nonceOf());
});
