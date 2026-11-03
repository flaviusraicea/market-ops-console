import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import { MapCard } from "./MapCard";
import { overviewVM } from "./viewModel";

const ds = parseDataset(data);

const meta = {
  title: "features/overview/MapCard",
  component: MapCard,
  decorators: [withDataset],
  args: { map: overviewVM(ds, portfolioMay).map },
} satisfies Meta<typeof MapCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The executive map is coloured by status, with no metric control. */
export const ByStatus: Story = {
  args: { scheme: "status" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(await c.findByRole("button", { name: /^Germany, off track/ })).toBeVisible();
    await expect(c.queryByRole("radiogroup", { name: "Map metric" })).toBeNull();
  },
};

export const ByMetric: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radiogroup", { name: "Map metric" })).toBeVisible();
  },
};
