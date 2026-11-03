import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";

import { overviewVM, regionBarsVM } from "@/features/overview/viewModel";
import { MapSection } from "./MapSection";

const ds = parseDataset(data);
const ctx: Context = { period: "2026-05" as Period, mode: "analyst", metric: "attainment", basis: "month" };

const meta = {
  title: "features/analyst/MapSection",
  component: MapSection,
  decorators: [withDataset],
  globals: { density: "analyst" },
  parameters: { nuqs: { searchParams: "?mode=analyst" } },
} satisfies Meta<typeof MapSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { map: overviewVM(ds, ctx).map, regions: regionBarsVM(ds, ctx) },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("radiogroup", { name: "Map metric" })).toBeVisible();
    // The geometry loads from /geo/markets.json; the markets are buttons once it is in.
    await expect(await c.findByRole("button", { name: /^Germany, / })).toBeVisible();
  },
};
