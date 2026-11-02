import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import data from "@/data/data.json";
import { breadcrumbTrail, parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";
import { Header } from "./Header";

const ds = parseDataset(data);
const base = {
  period: "2026-05" as Period,
  mode: "overview",
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
    latestPeriod: ds.meta.latestPeriod,
    period: "2026-05",
    mode: "overview",
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { trail: breadcrumbTrail(ds, portfolio) },
  parameters: { nuqs: { searchParams: "", onUrlUpdate: fn() } },
  play: async ({ canvasElement }) => {
    // At the latest period there is no period chip to clear.
    await expect(
      within(canvasElement).queryByRole("button", { name: "Clear period" }),
    ).not.toBeInTheDocument();
  },
};

export const EarlierPeriod: Story = {
  args: { trail: breadcrumbTrail(ds, portfolio), period: "2026-03" },
  parameters: { nuqs: { searchParams: "?period=2026-03", onUrlUpdate: fn() } },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "Clear period" }),
    ).toBeInTheDocument();
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
    const last = items[2]!;
    await expect(within(last).getByText("Germany")).toHaveAttribute("aria-current", "page");

    await expect(canvas.getByText(/data through may 2026/i)).toBeInTheDocument();

    const group = canvas.getByRole("radiogroup", { name: "View mode" });
    const overview = within(group).getByRole("radio", { name: "Overview" });
    await expect(overview).toBeChecked();

    overview.focus();
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
