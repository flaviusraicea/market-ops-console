import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";

import { HeatMapCard } from "./HeatMapCard";
import { analystVM } from "./viewModel";

const europe = { ...portfolioMay, mode: "analyst", region: "eu" } as const;

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
