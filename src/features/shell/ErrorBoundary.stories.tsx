import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("Chart failed");
}

const meta = {
  title: "features/shell/ErrorBoundary",
  component: ErrorBoundary,
  decorators: [
    (Story) => (
      <div className="max-w-[420px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { widget: "story", children: <Boom /> },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Failed: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent("This widget failed to load");
    await expect(c.getByRole("button", { name: "Reload widget" })).toBeVisible();
    await userEvent.tab();
    await expect(c.getByRole("button", { name: "Reload widget" })).toHaveFocus();
  },
};

export const Healthy: Story = {
  args: { children: <p>All good</p> },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("All good")).toBeVisible();
  },
};
