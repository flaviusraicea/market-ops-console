import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  title: "components/ui/Card",
  component: Card,
  decorators: [
    (Story) => (
      <div className="max-w-[420px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>By region</CardTitle>
          <CardDescription>Share of forecast, May 2026</CardDescription>
        </CardHeader>
        <CardContent>Europe 95.4%</CardContent>
      </>
    ),
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("By region")).toBeVisible();
  },
};
