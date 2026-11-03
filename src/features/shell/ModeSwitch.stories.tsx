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
  args: { mode: "executive", onChange: fn() },
} satisfies Meta<typeof ModeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Executive: Story = {
  play: async ({ canvasElement, args }) => {
    const executive = within(canvasElement).getByRole("radio", { name: "Executive" });
    executive.focus();
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
