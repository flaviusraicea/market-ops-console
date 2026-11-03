import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { StatusBadge } from "./StatusBadge";

const meta = {
  title: "components/StatusBadge",
  component: StatusBadge,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { status: "on_track", label: "On track", size: "md" },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTrack: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("On track")).toBeVisible();
  },
};

export const AtRisk: Story = { args: { status: "at_risk", label: "At risk" } };

export const OffTrack: Story = { args: { status: "off_track", label: "Off track" } };

export const Small: Story = { args: { status: "off_track", label: "Off track", size: "sm" } };
