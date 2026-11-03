import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { StatusGlyph } from "./StatusGlyph";

const meta = {
  title: "components/StatusGlyph",
  component: StatusGlyph,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StatusGlyph>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTrack: Story = {
  args: { status: "on_track" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("circle")).not.toBeNull();
  },
};

export const AtRisk: Story = {
  args: { status: "at_risk" },
  play: async ({ canvasElement }) => {
    // Shape, not only colour: a triangle has three points.
    await expect(canvasElement.querySelector("polygon")?.getAttribute("points")?.split(" ")).toHaveLength(3);
  },
};

export const OffTrack: Story = {
  args: { status: "off_track" },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("polygon")?.getAttribute("points")?.split(" ")).toHaveLength(4);
  },
};
