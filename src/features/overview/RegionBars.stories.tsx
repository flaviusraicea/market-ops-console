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
    const europe = canvas.getByRole("img", { name: "Europe, 95.4% of forecast" });
    await expect(europe.firstElementChild).toHaveClass("bg-bad-mark");
    const apac = canvas.getByRole("img", { name: "APAC, 104.9% of forecast" });
    await expect(apac.firstElementChild).toHaveClass("bg-accent");
    await expect(canvas.getByText("Europe is the drag.")).toBeVisible();
  },
};
