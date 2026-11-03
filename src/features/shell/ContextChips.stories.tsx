import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ContextChips } from "./ContextChips";

const meta = {
  title: "features/shell/ContextChips",
  component: ContextChips,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { latestPeriod: "2026-05", onPeriod: fn() },
} satisfies Meta<typeof ContextChips>;

export default meta;
type Story = StoryObj<typeof meta>;

/** At the latest period there is nothing to clear, so no chip shows. */
export const LatestPeriod: Story = {
  args: { period: "2026-05" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole("button", { name: "Clear period" })).toBeNull();
  },
};

export const EarlierPeriod: Story = {
  args: { period: "2026-03" },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Clear period" }));
    await expect(args.onPeriod).toHaveBeenCalledWith("2026-05");
  },
};
