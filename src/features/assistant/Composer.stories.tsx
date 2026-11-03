import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Composer } from "./Composer";

const meta = {
  title: "features/assistant/Composer",
  component: Composer,
  args: { value: "", onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

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
