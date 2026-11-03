import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ANALYST_STATE, open } from "./helpers";

const URL = "/?mode=analyst";

// Only an Analyst edits alert rules; the Executive view of this section is covered in slice23.spec.ts.
test.use({ storageState: ANALYST_STATE });

// Rules live in the browser; every test gets a fresh context, so each starts from an empty list.

async function chooseScope(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Scope" }).click();
  await page.getByRole("option", { name }).click();
}

const card = (page: Page) => page.getByRole("region", { name: /^Alerts/ });

/** The Alerts section is folded by default and remembers being open for the tab; open it once. */
async function openAlerts(page: Page, { remembered = false } = {}) {
  const trigger = card(page).getByRole("button", { name: /^Alerts/ });
  // After a reload the open state comes back by itself once the page hydrates.
  if (remembered) await expect(trigger).toHaveAttribute("aria-expanded", "true");
  else if ((await trigger.getAttribute("aria-expanded")) === "false") await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

test("an attainment of 120 is invalid, linked to its message, and blocks Save", async ({
  page,
}) => {
  await open(page, URL);
  await openAlerts(page);
  const input = card(page).getByRole("textbox", { name: "Attainment below" });
  await input.fill("120");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  const message = card(page).getByText("Enter a value between 0 and 100.");
  await expect(message).toBeVisible();
  const messageId = await message.evaluate((el) => el.closest("p")?.id ?? "");
  await expect(input).toHaveAttribute("aria-describedby", new RegExp(messageId));
  await expect(card(page).getByRole("button", { name: "Save thresholds" })).toBeDisabled();
});

test("Save shows the rule at once as Saving…, then Saved · just now and the evaluation", async ({
  page,
}) => {
  await open(page, URL);
  await openAlerts(page);
  await chooseScope(page, "Europe");
  await expect(
    card(page).getByText("No alert rules yet. Add one to watch a threshold."),
  ).toBeVisible();

  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  const list = card(page).getByRole("list", { name: "Saved alert rules" });
  await expect(list.getByText("Attainment below 95% · Europe")).toBeVisible({ timeout: 100 });
  await expect(list.getByText("Saving…").first()).toBeVisible({ timeout: 100 });

  await expect(card(page).getByText("Saved · just now")).toBeVisible({ timeout: 2000 });
  await expect(
    list.getByText("3 markets breach this rule: Germany, Italy, United Kingdom"),
  ).toBeVisible();
  await expect(list.getByText("2 markets breach this rule: Germany, Spain")).toBeVisible();
});

test("a failed save shows 97 briefly, then the alert Notice and the saved 95 again", async ({
  page,
}) => {
  await open(page, URL);
  await openAlerts(page);
  await chooseScope(page, "Europe");
  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  await expect(card(page).getByText("Saved · just now")).toBeVisible();

  await card(page).getByLabel("Simulate failure").check();
  await card(page).getByRole("textbox", { name: "Attainment below" }).fill("97");
  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  const list = card(page).getByRole("list", { name: "Saved alert rules" });
  await expect(list.getByText("Attainment below 97% · Europe")).toBeVisible({ timeout: 100 });

  const notice = card(page).getByRole("alert");
  await expect(notice.getByText("Couldn't save")).toBeVisible({ timeout: 3000 });
  // Focus moves to the notice, so Tab goes straight to Try again.
  await expect(notice).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(notice.getByRole("button", { name: "Try again" })).toBeFocused();
  await notice.focus();
  await expect(notice).toContainText(
    "Your thresholds were restored to the last saved values (growth below 0%, attainment below 95%).",
  );
  await expect(list.getByText("Attainment below 95% · Europe")).toBeVisible();
  await expect(card(page).getByRole("textbox", { name: "Attainment below" })).toHaveValue("95");

  await card(page).getByLabel("Simulate failure").uncheck();
  await notice.getByRole("button", { name: "Try again" }).click();
  await expect(card(page).getByText("Saved · just now")).toBeVisible({ timeout: 3000 });
  await expect(list.getByText("Attainment below 97% · Europe")).toBeVisible();
  await expect(card(page).getByRole("alert")).toHaveCount(0);
});

test("Delete asks first, with a danger button, and removes the rule", async ({ page }) => {
  await open(page, URL);
  await openAlerts(page);
  await chooseScope(page, "Germany");
  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  await expect(card(page).getByText("Saved · just now")).toBeVisible();
  const list = card(page).getByRole("list", { name: "Saved alert rules" });
  await expect(list.getByText("Attainment below 95% · Germany")).toBeVisible();

  await list.getByRole("button", { name: "Delete Attainment below 95% · Germany" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this rule?" });
  await expect(dialog).toContainText('"Attainment below 95% · Germany" will stop being evaluated.');
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  const confirm = dialog.getByRole("button", { name: "Delete" });
  await expect(confirm).toHaveAttribute("data-variant", "danger");
  await confirm.click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(list.getByText("Attainment below 95% · Germany")).toHaveCount(0);
});

test("saved rules survive a reload, and a deleted rule stays gone", async ({ page }) => {
  await open(page, URL);
  await openAlerts(page);
  await chooseScope(page, "Europe");
  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  await expect(card(page).getByText("Saved · just now")).toBeVisible();

  await page.reload();
  await openAlerts(page, { remembered: true });
  const list = card(page).getByRole("list", { name: "Saved alert rules" });
  await expect(list.getByText("Growth below 0% · Europe")).toBeVisible();
  await expect(list.getByText("Attainment below 95% · Europe")).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  // Saving again updates the two rules rather than adding more.
  await chooseScope(page, "Europe");
  await card(page).getByRole("button", { name: "Save thresholds" }).click();
  await expect(card(page).getByText("Saved · just now")).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(2);

  for (const name of ["Growth below 0% · Europe", "Attainment below 95% · Europe"]) {
    await list.getByRole("button", { name: `Delete ${name}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  // The delete is confirmed after a simulated round trip; wait for it to reach storage before reloading.
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("market-ops:alerts:v1") ?? "[]").length as number,
      ),
    )
    .toBe(0);
  await page.reload();
  await openAlerts(page, { remembered: true });
  await expect(
    card(page).getByText("No alert rules yet. Add one to watch a threshold."),
  ).toBeVisible();
});

for (const theme of ["light", "dark"] as const) {
  test(`axe finds no violations on the alerts card (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await open(page, URL);
    await openAlerts(page);
    await expect(card(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}
