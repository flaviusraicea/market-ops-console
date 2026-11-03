import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta = {
  title: "components/ui/Select",
  component: Select,
  decorators: [
    (Story) => (
      <div className="w-[220px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    defaultValue: "2026-05",
    children: (
      <>
        <SelectTrigger aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2026-05">May 2026</SelectItem>
          <SelectItem value="2026-04">April 2026</SelectItem>
        </SelectContent>
      </>
    ),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("combobox", { name: "Period" });
    await userEvent.click(trigger);
    const body = within(document.body);
    await userEvent.click(await body.findByRole("option", { name: "April 2026" }));
    await waitFor(() => expect(trigger).toHaveTextContent("April 2026"));
  },
};
