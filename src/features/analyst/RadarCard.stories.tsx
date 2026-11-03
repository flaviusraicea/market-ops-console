import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";

import { RadarCard } from "./RadarCard";
import { analystVM } from "./viewModel";

const europe = { ...portfolioMay, mode: "analyst", region: "eu" } as const;

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
    await userEvent.click(c.getByRole("button", { name: /^View as table/ }));
    await expect(c.getByRole("table")).toBeVisible();
  },
};
