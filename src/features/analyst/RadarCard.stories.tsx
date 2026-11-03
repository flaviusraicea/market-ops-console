import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";

import { RadarCard } from "./RadarCard";
import { analystVM } from "./viewModel";

const ds = parseDataset(data);
const europe: Context = { period: "2026-05" as Period, mode: "analyst", metric: "attainment", basis: "month", region: "eu" };

const meta = {
  title: "features/analyst/RadarCard",
  component: RadarCard,
  decorators: [withDataset],
  globals: { density: "analyst" },
} satisfies Meta<typeof RadarCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Europe: Story = {
  args: { vm: analystVM(ds, europe).radar, rowLabel: "Market" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "View as table" }));
    await expect(c.getByRole("table")).toBeVisible();
  },
};
