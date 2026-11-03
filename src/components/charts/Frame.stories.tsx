import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Frame } from "./Frame";

const meta = {
  title: "components/charts/Frame",
  component: Frame,
  args: {
    width: 240,
    height: 80,
    title: "Example chart",
    desc: "A single bar, to show the accessible shell.",
    margin: { top: 8, right: 8, bottom: 8, left: 8 },
    children: <rect width={120} height={40} fill="var(--series-actual)" />,
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Frame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Static: Story = {
  play: async ({ canvasElement }) => {
    const chart = within(canvasElement).getByRole("img", { name: "Example chart" });
    await expect(chart).toHaveAccessibleDescription("A single bar, to show the accessible shell.");
  },
};

/** Charts with focusable marks use a group, since an img may not contain interactive descendants. */
export const Interactive: Story = {
  args: { role: "group" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("group", { name: "Example chart" })).toBeVisible();
  },
};
