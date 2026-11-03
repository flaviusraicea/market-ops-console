import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";

import { MarketGrid } from "./MarketGrid";
import { analystVM } from "./viewModel";

const ds = parseDataset(data);
const base: Context = { period: "2026-05" as Period, mode: "analyst", metric: "attainment", basis: "month" };

const meta = {
  title: "features/analyst/MarketGrid",
  component: MarketGrid,
  decorators: [withDataset],
  globals: { density: "analyst" },
} satisfies Meta<typeof MarketGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Markets: Story = {
  args: { grid: analystVM(ds, base).grid },
  parameters: { nuqs: { searchParams: "?mode=analyst" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table")).toBeVisible();
    // Sorting by a header is one control, and the column says which way it is sorted.
    const header = c.getByRole("button", { name: /^ATTAINMENT/i });
    await userEvent.click(header);
    await expect(header.closest("th")).toHaveAttribute("aria-sort");
  },
};

export const Products: Story = {
  args: { grid: analystVM(ds, { ...base, region: "eu", market: "de" }).grid },
  parameters: { nuqs: { searchParams: "?mode=analyst&region=eu&market=de" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Veltrix")).toBeVisible();
  },
};
