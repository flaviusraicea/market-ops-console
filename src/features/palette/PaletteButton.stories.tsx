import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { PaletteButton } from "@/features/palette/PaletteButton";

const meta = {
  title: "features/palette/PaletteButton",
  component: PaletteButton,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaletteButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Open command palette" });
    await expect(button).toHaveAttribute("aria-keyshortcuts", "Control+K Meta+K");
  },
};
