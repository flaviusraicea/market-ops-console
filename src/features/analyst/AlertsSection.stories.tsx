import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import { AlertsSection } from "./AlertsSection";

const meta = {
  title: "features/analyst/AlertsSection",
  component: AlertsSection,
  decorators: [withDataset],
  globals: { density: "analyst" },
} satisfies Meta<typeof AlertsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FoldedThenOpened: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: /Alerts/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Leave the folded default for the next story.
    await userEvent.click(trigger);
  },
};
