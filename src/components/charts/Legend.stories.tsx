import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Legend } from "./Legend";
import { ATTAINMENT_LEGEND } from "./scales";

const meta = {
  title: "components/charts/Legend",
  component: Legend,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Legend>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lines: Story = {
  args: {
    label: "Series",
    items: [
      { label: "Actual", swatch: "line-solid", color: "--series-actual" },
      { label: "Forecast", swatch: "line-dashed", color: "--series-forecast" },
      { label: "Prior year", swatch: "line-dotted", color: "--series-prior" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("listitem")).toHaveLength(3);
  },
};

export const Status: Story = {
  args: {
    label: "Status",
    items: [
      { label: "On track", swatch: "status", status: "on_track" },
      { label: "At risk", swatch: "status", status: "at_risk" },
      { label: "Off track", swatch: "status", status: "off_track" },
    ],
  },
};

export const Bins: Story = {
  // The bins the attainment map and heat map use, so the story cannot drift from the app.
  args: {
    label: "Attainment colour scale",
    items: ATTAINMENT_LEGEND.map((b) => ({
      label: b.label,
      swatch: "fill" as const,
      color: b.token,
    })),
  },
  play: async ({ canvasElement }) => {
    const items = within(canvasElement).getAllByRole("listitem");
    await expect(items.map((li) => li.textContent)).toEqual(ATTAINMENT_LEGEND.map((b) => b.label));
  },
};
