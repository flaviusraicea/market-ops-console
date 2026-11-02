import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ConfidenceMeter } from "./ConfidenceMeter";

const meta = {
  title: "components/ConfidenceMeter",
  component: ConfidenceMeter,
} satisfies Meta<typeof ConfidenceMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

// The a11y addon is the test here (parameters.a11y.test is "error" globally).
export const High: Story = { args: { level: "high" } };
export const Medium: Story = { args: { level: "medium" } };
export const Low: Story = { args: { level: "low" } };
