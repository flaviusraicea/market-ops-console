import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { portfolioMay } from "../../../.storybook/decorators";
import { KpiRow } from "./KpiRow";
import { overviewVM } from "./viewModel";

const ds = parseDataset(data);

const meta = {
  title: "features/overview/KpiRow",
  component: KpiRow,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { tiles: overviewVM(ds, portfolioMay).tiles },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="kpi-headline"]')).toHaveLength(4);
    await expect(within(canvasElement).getByText(/PORTFOLIO REVENUE/i)).toBeVisible();
  },
};
