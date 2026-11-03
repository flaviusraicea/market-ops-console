import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./skeleton";

const meta = {
  title: "components/ui/Skeleton",
  component: Skeleton,
  decorators: [
    (Story) => (
      <div className="max-w-[320px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { className: "h-8 w-full" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
