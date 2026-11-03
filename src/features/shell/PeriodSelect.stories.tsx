import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { PeriodSelect } from "./PeriodSelect";

const meta = {
  title: "features/shell/PeriodSelect",
  component: PeriodSelect,
  decorators: [
    (Story) => (
      <div className="w-[200px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { period: "2026-05", periods: ["2026-03", "2026-04", "2026-05"], onChange: fn() },
} satisfies Meta<typeof PeriodSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole("combobox", { name: "Period" });
    await expect(trigger).toHaveTextContent("May 2026");
    await userEvent.click(trigger);
    // Newest first.
    const options = await within(document.body).findAllByRole("option");
    await expect(options[0]).toHaveTextContent("May 2026");
    await userEvent.click(options[2]!);
    await expect(args.onChange).toHaveBeenCalledWith("2026-03");
  },
};
