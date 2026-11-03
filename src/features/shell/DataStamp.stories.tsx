import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { DataStamp } from "./DataStamp";

const meta = {
  title: "features/shell/DataStamp",
  component: DataStamp,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: { latestPeriod: "2026-05" },
} satisfies Meta<typeof DataStamp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Data through May 2026")).toBeVisible();
  },
};
