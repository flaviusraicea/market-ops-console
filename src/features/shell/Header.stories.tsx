import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import data from "@/data/data.json";
import { breadcrumbTrail, type Context, type Period } from "@/domain";
import { parseDataset } from "@/domain/dataset";
import { withDataset } from "../../../.storybook/decorators";
import { Header } from "./Header";

const ds = parseDataset(data);
const base = {
  period: "2026-05" as Period,
  mode: "executive",
  metric: "attainment",
  basis: "month",
} as const;
const periods = ds.meta.periods;

const portfolio: Context = { ...base };
const germany: Context = { ...base, region: "eu", market: "de" };

const meta = {
  title: "features/shell/Header",
  component: Header,
  decorators: [withDataset],
  args: {
    periods,
    products: ds.products.map((p) => ({ id: p.id, name: p.name })),
    latestPeriod: ds.meta.latestPeriod,
    period: "2026-05",
    mode: "executive",
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { trail: breadcrumbTrail(ds, portfolio) },
  parameters: { nuqs: { searchParams: "", onUrlUpdate: fn() } },
  play: async ({ canvasElement }) => {
    // The only crumb is never truncated.
    const nav = within(canvasElement).getByRole("navigation", { name: "Drill path" });
    const crumb = within(nav).getByText("Portfolio");
    await expect(crumb.scrollWidth).toBeLessThanOrEqual(crumb.clientWidth);
    await expect(crumb).toBeVisible();
  },
};

/** From 768 px the period and product selects live in the page toolbar, so the header carries none. */
export const SelectsLiveInToolbar: Story = {
  name: "Header has no period or product select on desktop",
  args: { trail: breadcrumbTrail(ds, germany), period: "2026-03" },
  parameters: { nuqs: { searchParams: "?region=eu&market=de&period=2026-03", onUrlUpdate: fn() } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole("combobox", { name: "Period" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("combobox", { name: "Product" })).not.toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Clear period" })).not.toBeInTheDocument();
  },
};

export const Germany: Story = {
  args: { trail: breadcrumbTrail(ds, germany) },
  parameters: { nuqs: { searchParams: "?region=eu&market=de", onUrlUpdate: fn() } },
  play: async ({ canvasElement, parameters }) => {
    const canvas = within(canvasElement);

    const nav = canvas.getByRole("navigation", { name: "Drill path" });
    const items = within(nav).getAllByRole("listitem");
    await expect(items).toHaveLength(3);
    const portfolioLink = within(items[0]!).getByRole("link", { name: "Portfolio" });
    await expect(portfolioLink).toHaveAttribute("href", "/?mode=executive");
    const europeLink = within(items[1]!).getByRole("link", { name: "Europe" });
    await expect(europeLink).toHaveAttribute("href", "/?region=eu&mode=executive");
    const last = items[2]!;
    await expect(within(last).getByText("Germany")).toHaveAttribute("aria-current", "page");

    await expect(canvas.getByText(/data through may 2026/i)).toBeInTheDocument();

    const group = canvas.getByRole("radiogroup", { name: "View" });
    const executive = within(group).getByRole("radio", { name: "Executive" });
    await expect(executive).toBeChecked();

    executive.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(within(group).getByRole("radio", { name: "Analyst" })).toBeChecked(),
    );
    const spy = parameters["nuqs"].onUrlUpdate as ReturnType<typeof fn>;
    await expect(spy).toHaveBeenCalled();
    const urls = spy.mock.calls.map((c) => String((c[0] as { queryString: string }).queryString));
    await expect(urls.some((u) => u.includes("mode=analyst"))).toBe(true);

    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    await expect(
      canvas.getByRole("button", { name: dark ? "Switch to light theme" : "Switch to dark theme" }),
    ).toBeInTheDocument();
  },
};

/** Under 768 px: two rows. Row 1 is the wordmark, the drill path, theme and account; row 2 the period and mode switch. */
export const Phone: Story = {
  args: { trail: breadcrumbTrail(ds, germany) },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    nuqs: { searchParams: "region=eu&market=de" },
  },
  play: async ({ canvasElement }) => {
    const root = canvasElement.ownerDocument.documentElement;
    await expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const canvas = within(canvasElement);
    const period = canvas.getByRole("combobox", { name: "Period" });
    const account = canvas.getByRole("button", { name: /^Signed in as/ });
    await expect(period.getBoundingClientRect().top).toBeGreaterThan(
      account.getBoundingClientRect().bottom - 1,
    );
    await expect(account.getBoundingClientRect().right).toBeLessThanOrEqual(root.clientWidth);
  },
};
