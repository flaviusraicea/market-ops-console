import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Panel } from "./Panel";

const meta = {
  title: "features/assistant/Panel",
  component: Panel,
  args: { onSubmit: fn() },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Assistant")).toBeInTheDocument();

    const labels = [
      "Which markets are at risk?",
      "Why did Germany dip?",
      "What will sales be next year?",
    ];
    const chips = within(canvas.getByRole("list", { name: "Suggested questions" })).getAllByRole(
      "button",
    );
    await expect(chips.map((b) => b.textContent)).toEqual(labels);

    const box = canvas.getByRole("textbox", { name: "Ask the assistant" });
    await userEvent.click(canvas.getByRole("button", { name: "Why did Germany dip?" }));
    await expect(box).toHaveValue("Why did Germany dip?");
    await expect(box).toHaveFocus();

    await userEvent.type(box, "{Shift>}{Enter}{/Shift}");
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(box);
    await userEvent.type(box, "Why did Germany dip?{Enter}");
    await expect(args.onSubmit).toHaveBeenCalledWith("Why did Germany dip?");
  },
};
