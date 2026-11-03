import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ThemeToggle } from "./ThemeToggle";

const meta = {
  title: "features/shell/ThemeToggle",
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const root = document.documentElement;
    const was = root.getAttribute("data-theme");
    const toggle = within(canvasElement).getByRole("button", {
      name: /^Switch to (dark|light) theme$/,
    });
    const label = toggle.getAttribute("aria-label");
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toHaveAttribute("aria-label", label ?? ""));
    // Put the story's theme back for the checks that follow.
    if (was === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", was);
  },
};
