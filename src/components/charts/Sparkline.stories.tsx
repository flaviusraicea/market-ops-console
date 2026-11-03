import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Sparkline } from "./Sparkline";

const VALUES = [3.1, 3.3, 3.2, 3.6, 3.9, 3.7, 4.1, 4.4, 4.2, 4.6, 4.9, 5.2];

const meta = {
  title: "components/charts/Sparkline",
  component: Sparkline,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { values: VALUES, label: "12-month revenue trend, latest $5.2M" },
} satisfies Meta<typeof Sparkline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img", { name: /12-month revenue trend/ })).toBeVisible();
  },
};

export const WithForecastAndAnomaly: Story = {
  args: {
    secondary: VALUES.map((v) => v * 1.04),
    anomalyIndex: 5,
    color: "var(--bad-mark)",
    width: 160,
    height: 32,
  },
};
