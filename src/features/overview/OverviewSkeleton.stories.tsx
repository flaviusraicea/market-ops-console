import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { OverviewSkeleton } from "./OverviewSkeleton";

const meta = {
  title: "features/overview/OverviewSkeleton",
  component: OverviewSkeleton,
} satisfies Meta<typeof OverviewSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector('[data-slot="overview-skeleton"]');
    await expect(root).toHaveAttribute("aria-busy", "true");
    await expect(root?.textContent ?? "").not.toMatch(/\d/);
  },
};
