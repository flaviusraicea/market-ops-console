import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { dataset as ds, portfolioMay } from "../../../.storybook/decorators";
import { overviewVM } from "@/features/overview/viewModel";
import { KpiStrip } from "./KpiStrip";


const meta = {
  title: "features/analyst/KpiStrip",
  component: KpiStrip,
  globals: { density: "analyst" },
  decorators: [
    (Story) => (
      <div className="bg-surface p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { tiles: overviewVM(ds, { ...portfolioMay, mode: "analyst" }).tiles },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="kpi-headline"]')).toHaveLength(4);
  },
};
