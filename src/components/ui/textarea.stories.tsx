import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Textarea } from "./textarea";

const meta = {
  title: "components/ui/Textarea",
  component: Textarea,
  decorators: [
    (Story) => (
      <div className="max-w-[360px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { "aria-label": "Note", placeholder: "Add a note" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("textbox", { name: "Note" });
    await userEvent.type(box, "Germany looks off");
    await expect(box).toHaveValue("Germany looks off");
  },
};
