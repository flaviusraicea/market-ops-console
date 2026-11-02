import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const URL = "/?mode=analyst";

// The route keeps one in-memory store per server, so the journeys run in order from an empty list.
test.describe.configure({ mode: "serial" });
test.beforeEach(async ({ request }) => {
  const { rules } = (await (await request.get("/api/alerts")).json()) as {
    rules: { id: string }[];
  };
  await Promise.all(rules.map((r) => request.delete(`/api/alerts?id=${r.id}`)));
});

async function chooseScope(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Scope" }).click();
  await page.getByRole("option", { name }).click();
}

const card = (page: Page) => page.getByRole("region", { name: "Alert thresholds" });

test("an attainment of 120 is invalid, linked to its message, and blocks Save", async ({
  page,
}) => {
  await page.goto(URL);
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
  await page.goto(URL);
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
  await page.goto(URL);
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
  await page.goto(URL);
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

for (const theme of ["light", "dark"] as const) {
  test(`axe finds no violations on the alerts card (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto(URL);
    await expect(card(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).include("#alerts-h").analyze();
    expect(results.violations).toEqual([]);
    const section = await new AxeBuilder({ page }).analyze();
    expect(section.violations).toEqual([]);
  });
}
