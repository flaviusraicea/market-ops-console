import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "components/ui/Label",
  component: Label,
  decorators: [
    (Story) => (
      <div className="flex max-w-[320px] flex-col gap-1.5 p-4">
        <Story />
        <Input id="name" />
      </div>
    ),
  ],
  args: { htmlFor: "name", children: "Alert name" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Clicking the label focuses its control.
    await userEvent.click(within(canvasElement).getByText("Alert name"));
    await expect(within(canvasElement).getByRole("textbox")).toHaveFocus();
  },
};
