import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Suggestions } from "./Suggestions";

const meta = {
  title: "features/assistant/Suggestions",
  component: Suggestions,
  decorators: [
    (Story) => (
      <div className="max-w-[360px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { onPick: fn() },
} satisfies Meta<typeof Suggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const list = within(canvasElement).getByRole("list", { name: "Suggested questions" });
    await userEvent.click(within(list).getByRole("button", { name: "Why did Germany dip?" }));
    await expect(args.onPick).toHaveBeenCalledWith("Why did Germany dip?");
  },
};
