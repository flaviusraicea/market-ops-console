import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Eyebrow } from "./Eyebrow";

const meta = {
  title: "components/Eyebrow",
  component: Eyebrow,
  args: { children: "Needs attention" },
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText("Needs attention");
    await expect(getComputedStyle(el).whiteSpace).toBe("nowrap");
    await expect(getComputedStyle(el).textTransform).toBe("uppercase");
  },
};

export const NeverWraps: Story = {
  render: () => (
    <div className="w-24 overflow-hidden border border-border p-1">
      <Eyebrow>Needs attention</Eyebrow>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const el = within(canvasElement).getByText("Needs attention");
    await expect(el.getBoundingClientRect().height).toBeLessThanOrEqual(14);
  },
};
