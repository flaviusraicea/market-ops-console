import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

const meta = {
  title: "components/ui/Tooltip",
  component: Tooltip,
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="flex justify-center p-16">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  args: {
    children: (
      <>
        <TooltipTrigger asChild>
          <Button variant="secondary">Status rule</Button>
        </TooltipTrigger>
        <TooltipContent>On track at 99% of forecast or more</TooltipContent>
      </>
    ),
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensOnFocus: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("button", { name: "Status rule" })).toHaveFocus();
    await waitFor(() =>
      expect(within(document.body).getAllByRole("tooltip").length).toBeGreaterThan(0),
    );
  },
};
