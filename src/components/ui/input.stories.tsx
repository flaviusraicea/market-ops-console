import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "components/ui/Input",
  component: Input,
  decorators: [
    (Story) => (
      <div className="flex max-w-[320px] flex-col gap-1.5 p-4">
        <Label htmlFor="threshold">Threshold (%)</Label>
        <Story />
      </div>
    ),
  ],
  args: { id: "threshold", inputMode: "decimal" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText("Threshold (%)");
    await userEvent.type(input, "95");
    await expect(input).toHaveValue("95");
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, "aria-describedby": "err", defaultValue: "abc" },
  decorators: [
    (Story) => (
      <>
        <Story />
        <p id="err" className="text-[length:var(--text-label)] text-bad-text">
          Enter a number between 0 and 200.
        </p>
      </>
    ),
  ],
};

export const Disabled: Story = { args: { disabled: true, defaultValue: "90" } };
