import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Composer } from "./Composer";

const meta = {
  title: "features/assistant/Composer",
  component: Composer,
  args: { value: "", onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

const narrow: Decorator = (Story) => (
  <div style={{ width: 340 }}>
    <Story />
  </div>
);

/** One row, with a placeholder short enough not to wrap at the panel's width. */
export const Empty: Story = {
  decorators: [narrow],
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("textbox", { name: "Ask the assistant" });
    await expect(box).toHaveAttribute("placeholder", "Ask about a market or period…");
    await expect(box.scrollHeight).toBeLessThanOrEqual(box.clientHeight);
  },
};

/** Grows with the text, then scrolls past four rows. */
export const Multiline: Story = {
  args: { value: "Why did Germany dip in March?\nAnd what about France?\nAnd Spain?" },
  decorators: [narrow],
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("textbox", { name: "Ask the assistant" });
    await expect(box.clientHeight).toBeGreaterThan(48);
  },
};

export const WithAboutChip: Story = {
  args: {
    value: "Why did Germany's revenue dip in Mar 2026?",
    about: "Germany · Mar 2026",
    note: "Filled from the heat map cell. Edit, then press Enter.",
    onClearAbout: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Germany · Mar 2026")).toBeVisible();
    await expect(
      canvas.getByRole("textbox", { name: "Ask the assistant" }),
    ).toHaveAccessibleDescription("Filled from the heat map cell. Edit, then press Enter.");
    await userEvent.click(canvas.getByRole("button", { name: "Clear context Germany · Mar 2026" }));
    await expect(args.onClearAbout).toHaveBeenCalled();
  },
};
