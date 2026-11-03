import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ModeSwitch } from "./ModeSwitch";

const meta = {
  title: "features/shell/ModeSwitch",
  component: ModeSwitch,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { mode: "overview", onChange: fn() },
} satisfies Meta<typeof ModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  play: async ({ canvasElement, args }) => {
    const overview = within(canvasElement).getByRole("radio", { name: "Overview" });
    overview.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(args.onChange).toHaveBeenCalledWith("analyst");
  },
};

export const Analyst: Story = {
  args: { mode: "analyst" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("radio", { name: "Analyst" })).toBeChecked();
  },
};
