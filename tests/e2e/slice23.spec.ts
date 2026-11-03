import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ANALYST_STATE, open } from "./helpers";

const WCAG = ["wcag2a", "wcag2aa", "wcag21aa"];
const THEMES = ["light", "dark"] as const;

const avatar = (page: Page, who: string) =>
  page.getByRole("button", { name: new RegExp(`^Signed in as ${who}`) });
const alerts = (page: Page) => page.getByRole("region", { name: /^Alerts/ });

async function openAlerts(page: Page) {
  const trigger = alerts(page).getByRole("button", { name: /^Alerts/ });
  if ((await trigger.getAttribute("aria-expanded")) === "false") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("a first visit is signed in as the Executive and lands on the Executive overview", async ({
  page,
  context,
}) => {
  await open(page, "/");
  const cookie = (await context.cookies()).find((c) => c.name === "market-ops-role");
  expect(cookie?.value).toBe("executive");
  expect(cookie?.sameSite).toBe("Lax");
  await expect(page.getByRole("radio", { name: "Executive" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-density", "executive");
  await expect(avatar(page, "Dana Whitfield")).toHaveAccessibleName(
    "Signed in as Dana Whitfield, Executive role, alerts read-only. Account menu",
  );
});

test("the Executive reads the alert rules but cannot edit them", async ({ page }) => {
  await open(page, "/?mode=analyst");
  await openAlerts(page);
  const section = alerts(page);
  await expect(section.getByRole("note")).toContainText("Read-only for Executives.");
  await expect(section.getByRole("note")).toContainText("Switch to Analyst to edit rules.");
  await expect(section.getByRole("textbox", { name: "Growth below" })).toBeDisabled();
  await expect(section.getByRole("textbox", { name: "Attainment below" })).toBeDisabled();
  await expect(section.getByRole("combobox", { name: "Scope" })).toBeDisabled();
  await expect(section.getByRole("button", { name: "Save thresholds" })).toHaveCount(0);
});

test("the API refuses an Executive's write with 403 read_only_role", async ({ request }) => {
  const res = await request.post("/api/alerts", {
    data: { metric: "attainment", comparator: "below", threshold: 95, scope: "portfolio" },
  });
  expect(res.status()).toBe(403);
  expect(await res.json()).toMatchObject({ error: "read_only_role" });
});

test("Switch to Analyst in the menu lands on the Analyst view with editable alerts", async ({
  page,
}) => {
  await open(page, "/");
  await avatar(page, "Dana Whitfield").click();
  await page
    .getByRole("menuitemradio", { name: "Switch role to Analyst (can edit alerts)" })
    .click();
  await expect(avatar(page, "Sam Okafor")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Analyst" })).toBeChecked();
  await expect(page).toHaveURL(/mode=analyst/);
  await page.getByRole("gridcell").first().waitFor();
  await openAlerts(page);
  await expect(alerts(page).getByRole("note")).toHaveCount(0);
  await expect(alerts(page).getByRole("textbox", { name: "Growth below" })).toBeEnabled();
  await expect(alerts(page).getByRole("button", { name: "Save thresholds" })).toBeVisible();
});

test("the notice's own button switches the role too", async ({ page }) => {
  await open(page, "/?mode=analyst");
  await openAlerts(page);
  await alerts(page).getByRole("button", { name: "Switch to Analyst" }).click();
  await expect(avatar(page, "Sam Okafor")).toBeVisible();
  await expect(alerts(page).getByRole("button", { name: "Save thresholds" })).toBeVisible();
});

test.describe("signed in as the Analyst", () => {
  test.use({ storageState: ANALYST_STATE });

  test("a bare URL opens the analyst view; a shared executive link still shows the overview", async ({
    page,
  }) => {
    await open(page, "/");
    await expect(page.getByRole("radio", { name: "Analyst" })).toBeChecked();
    await open(page, "/?mode=executive");
    await expect(page.getByRole("radio", { name: "Executive" })).toBeChecked();
    await expect(avatar(page, "Sam Okafor")).toBeVisible();
  });

  test("a legacy mode=overview link is redirected to mode=executive and keeps its scope", async ({
    page,
  }) => {
    await page.goto("/?mode=overview&market=de");
    await page.getByRole("main").waitFor();
    expect(new URL(page.url()).search).toBe("?mode=executive&market=de");
    await expect(page.getByRole("radio", { name: "Executive" })).toBeChecked();
    await expect(page.getByRole("navigation", { name: "Drill path" })).toContainText("Germany");
  });
});

test("Sign out goes to the sign-in screen, and picking a persona returns to its view", async ({
  page,
}) => {
  await open(page, "/");
  await avatar(page, "Dana Whitfield").click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in to Market Ops" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with SSO" })).toBeDisabled();

  await page.getByRole("button", { name: /Dana Whitfield/ }).click();
  await expect(page).toHaveURL(/\/\?mode=executive$/);
  await expect(page.getByRole("radio", { name: "Executive" })).toBeChecked();
  await expect(avatar(page, "Dana Whitfield")).toBeVisible();
});

test("the Analyst persona card opens the analyst view; Enter picks a card", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("heading", { name: "Sign in to Market Ops" }).waitFor();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Sam Okafor/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/\?mode=analyst$/);
  await expect(page.getByRole("radio", { name: "Analyst" })).toBeChecked();
  // The header must follow the new persona without a reload.
  await expect(avatar(page, "Sam Okafor")).toBeVisible();
  await expect(avatar(page, "Dana Whitfield")).toHaveCount(0);
});

for (const theme of THEMES) {
  test.describe(`axe (${theme})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    });

    test("the sign-in screen has no violations", async ({ page }) => {
      await page.goto("/sign-in");
      await page.getByRole("heading", { name: "Sign in to Market Ops" }).waitFor();
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
    });

    test("the open account menu has no violations", async ({ page }) => {
      await open(page, "/");
      await avatar(page, "Dana Whitfield").click();
      await page.getByRole("menu").waitFor();
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
    });

    test("the read-only alerts have no violations", async ({ page }) => {
      await open(page, "/?mode=analyst");
      await openAlerts(page);
      await expect(alerts(page).getByRole("note")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}
