import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

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

export const ReadOnly: Story = {
  args: { readOnly: true, onSwitchToAnalyst: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: /Alerts/ });
    await userEvent.click(trigger);
    const notice = await canvas.findByRole("note");
    await expect(notice).toHaveTextContent("Read-only for Executives.");
    await expect(notice).toHaveTextContent("Switch to Analyst to edit rules.");
    await expect(await canvas.findByRole("textbox", { name: "Growth below" })).toBeDisabled();
    await expect(canvas.getByRole("textbox", { name: "Attainment below" })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Scope" })).toBeDisabled();
    await expect(canvas.queryByRole("button", { name: "Save thresholds" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Switch to Analyst" }));
    await expect(args.onSwitchToAnalyst).toHaveBeenCalled();
    // Leave the folded default for the next story.
    await userEvent.click(trigger);
  },
};
