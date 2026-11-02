import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { CitationChip } from "./CitationChip";

const label = "Germany, Mar 2026 (largest dip)";
const resolved = { ok: true };

const meta = {
  title: "components/CitationChip",
  component: CitationChip,
  args: { label, resolved, pressed: false, index: 1, id: "chip-a1-1", onFollow: fn() },
  decorators: [
    (Story) => (
      <div className="bg-ai-bg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CitationChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Resolved: Story = {
  play: async ({ canvasElement, args }) => {
    const chip = within(canvasElement).getByRole("button", { name: `Go to ${label}` });
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(chip);
    await expect(args.onFollow).toHaveBeenCalledOnce();
  },
};

export const Pressed: Story = {
  args: { pressed: true },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: `Go to ${label}` }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

export const Unresolved: Story = {
  args: {
    label: "Atlantis, Mar 2026",
    resolved: { ok: false },
  },
  play: async ({ canvasElement, args }) => {
    const chip = within(canvasElement).getByRole("button", { name: "Go to Atlantis, Mar 2026" });
    await expect(chip).toBeDisabled();
    await expect(chip).toHaveAccessibleDescription("Could not resolve this citation");
    await expect(chip.className).toContain("border-dashed");
    await expect(args.onFollow).not.toHaveBeenCalled();
  },
};

export const Disagreement: Story = {
  args: { disagreement: { assistant: "at risk", source: "off track" } },
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button", { name: `Go to ${label}` });
    await expect(chip).toHaveAccessibleDescription(
      "Assistant says at risk; source data says off track",
    );
  },
};
