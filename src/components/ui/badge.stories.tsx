import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { StatusGlyph } from "@/components/StatusGlyph";
import { Badge } from "./badge";

const meta = {
  title: "components/ui/Badge",
  component: Badge,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { children: "Derived" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const OnTrack: Story = {
  args: {
    variant: "on_track",
    children: (
      <>
        <StatusGlyph status="on_track" />
        On track
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("On track")).toBeVisible();
  },
};

export const AtRisk: Story = {
  args: {
    variant: "at_risk",
    children: (
      <>
        <StatusGlyph status="at_risk" />
        At risk
      </>
    ),
  },
};

export const OffTrack: Story = {
  args: {
    variant: "off_track",
    children: (
      <>
        <StatusGlyph status="off_track" />
        Off track
      </>
    ),
  },
};
