import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { portfolioMay } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { panelContextVM } from "@/features/overview/viewModel";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "features/assistant/EmptyState",
  component: EmptyState,
  args: { context: panelContextVM(parseDataset(data), portfolioMay), onPick: fn() },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("About Portfolio · May 2026")).toBeVisible();

    // "What changed" is derived data, so it sits outside the lilac AI block.
    const line = canvas.getByText(/^Germany is furthest from plan/);
    await expect(line.closest("[data-ai]")).toBeNull();
    await expect(
      canvas.getByText("About Portfolio · May 2026").closest("[data-ai]"),
    ).not.toBeNull();

    const rows = within(canvas.getByRole("list", { name: "Suggested questions" })).getAllByRole(
      "button",
    );
    await expect(rows).toHaveLength(3);
    await userEvent.click(rows[1]!);
    await expect(args.onPick).toHaveBeenCalledWith("Why did Germany dip?");
  },
};
