import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import { CardHeader } from "./CardHeader";

const meta = {
  title: "components/CardHeader",
  component: CardHeader,
  decorators: [
    (Story) => (
      <div className="max-w-xl rounded-card border border-border bg-surface p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Title: Story = {
  args: { title: "Top movers" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "Top movers" })).toBeVisible();
  },
};

export const TitleSubtitle: Story = {
  args: {
    title: "Germany",
    subtitle: "Revenue vs forecast vs prior year · Jun 2024 – May 2026 · USD",
    caption: "Derived · sum of series",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Revenue vs forecast/)).toBeVisible();
    await expect(c.getByText("Derived · sum of series")).toBeVisible();
  },
};

export const WithActions: Story = {
  args: {
    title: "Markets by Attainment",
    caption: "May 2026 · Source · data.json",
    actions: <Button variant="ghost">View as table</Button>,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: "View as table" }),
    ).toBeVisible();
  },
};
