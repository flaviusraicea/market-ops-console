import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AssistantRail } from "./AssistantRail";

const meta = {
  title: "features/shell/AssistantRail",
  component: AssistantRail,
  args: { onToggle: fn() },
} satisfies Meta<typeof AssistantRail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {
  play: async ({ canvasElement, args }) => {
    const toggle = within(canvasElement).getByRole("button", { name: "Open assistant" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};

export const CollapsedWithBadge: Story = {
  args: { unread: 1 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img", { name: "1 new answer" })).toBeVisible();
  },
};
