import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Legend } from "./Legend";

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
  args: {
    label: "Attainment bins",
    items: ["--div-n3", "--div-n2", "--div-n1", "--div-0", "--div-p1", "--div-p2", "--div-p3"].map((color, i) => ({
      label: ["< 90%", "90–95%", "95–99%", "99–101%", "101–105%", "105–110%", "> 110%"][i] ?? "",
      swatch: "fill" as const,
      color,
    })),
  },
};
