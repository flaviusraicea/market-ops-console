import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain/dataset";
import { RegionBars } from "./RegionBars";
import { regionBarsVM } from "./viewModel";

const ds = parseDataset(data);

const meta = {
  title: "features/overview/RegionBars",
  component: RegionBars,
  decorators: [withDataset],
} satisfies Meta<typeof RegionBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { bars: regionBarsVM(ds, portfolioMay) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Each row is one button named by its visible text; the bar inside takes the row's status colour.
    const europe = canvas.getByRole("button", {
      name: /^Drill into Europe\b.*At risk\s*,\s*95\.4%$/,
    });
    await expect(europe.querySelector("[aria-hidden] > span")).toHaveClass("bg-warn-mark");
    const apac = canvas.getByRole("button", {
      name: /^Drill into APAC\b.*On track\s*,\s*104\.9%$/,
    });
    await expect(apac.querySelector("[aria-hidden] > span")).toHaveClass("bg-ok-mark");
    await expect(canvas.getByText("Europe is the drag.")).toBeVisible();
  },
};
