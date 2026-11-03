import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";

import { HeatMapCard } from "./HeatMapCard";
import { analystVM } from "./viewModel";

const ds = parseDataset(data);
const europe: Context = { period: "2026-05" as Period, mode: "analyst", metric: "attainment", basis: "month", region: "eu" };

const meta = {
  title: "features/analyst/HeatMapCard",
  component: HeatMapCard,
  decorators: [withDataset],
  globals: { density: "analyst" },
  parameters: { nuqs: { searchParams: "?mode=analyst&region=eu" } },
} satisfies Meta<typeof HeatMapCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Europe: Story = {
  args: { vm: analystVM(ds, europe).heatMap },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Attainment colour scale" })).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "View as table" }));
    await expect(c.getByRole("table")).toBeVisible();
  },
};
