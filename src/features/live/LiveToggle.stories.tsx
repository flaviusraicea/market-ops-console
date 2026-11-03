import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { LiveToggle } from "./LiveToggle";

const meta = {
  title: "features/live/LiveToggle",
  component: LiveToggle,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { live: false, onChange: fn() },
} satisfies Meta<typeof LiveToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paused: Story = {
  play: async ({ canvasElement, args }) => {
    const group = within(canvasElement).getByRole("group", { name: "Live data" });
    await expect(
      within(group).getByRole("button", { name: "Paused", pressed: true }),
    ).toBeVisible();
    await expect(within(group).getByRole("button", { name: "Live", pressed: false })).toBeVisible();
    await userEvent.click(within(group).getByRole("button", { name: "Live" }));
    await expect(args.onChange).toHaveBeenCalledWith(true);
  },
};

export const Live: Story = {
  args: { live: true },
  play: async ({ canvasElement, args }) => {
    const group = within(canvasElement).getByRole("group", { name: "Live data" });
    await expect(within(group).getByRole("button", { name: "Live", pressed: true })).toBeVisible();
    await userEvent.click(within(group).getByRole("button", { name: "Paused" }));
    await expect(args.onChange).toHaveBeenCalledWith(false);
  },
};
