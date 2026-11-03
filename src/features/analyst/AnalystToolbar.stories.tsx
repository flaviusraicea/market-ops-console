import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import { AnalystToolbar } from "./AnalystToolbar";

const meta = {
  title: "features/analyst/AnalystToolbar",
  component: AnalystToolbar,
  decorators: [withDataset],
  globals: { density: "analyst" },
  args: {
    periods: ["2026-03", "2026-04", "2026-05"],
    products: [
      { id: "veltrix", name: "Veltrix" },
      { id: "nuvora", name: "Nuvora" },
    ],
    basis: "month",
    matDisabled: true,
    statusRule: "On track at 99% of forecast or more; at risk from 95%.",
  },
} satisfies Meta<typeof AnalystToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No market selected: the product control waits for one. */
export const Portfolio: Story = {
  parameters: { nuqs: { searchParams: "?mode=analyst" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("toolbar")).toBeVisible();
    await expect(c.getByRole("combobox", { name: "Product" })).toBeDisabled();
  },
};

export const MarketSelected: Story = {
  parameters: { nuqs: { searchParams: "?mode=analyst&region=eu&market=de" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("combobox", { name: "Product" })).toBeEnabled();
  },
};
