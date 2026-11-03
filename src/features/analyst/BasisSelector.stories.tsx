import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import { BasisSelector } from "./BasisSelector";

const meta = {
  title: "features/analyst/BasisSelector",
  component: BasisSelector,
  decorators: [
    withDataset,
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { basis: "month", matDisabled: false },
} satisfies Meta<typeof BasisSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radio", { name: "Month" })).toBeChecked();
  },
};

export const MatUnavailable: Story = {
  args: { matDisabled: true, matFallback: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radio", { name: "MAT" })).toHaveAttribute("aria-disabled", "true");
  },
};
