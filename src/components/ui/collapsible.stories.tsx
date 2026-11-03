import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "components/ui/Collapsible",
  component: Collapsible,
  decorators: [
    (Story) => (
      <div className="max-w-[360px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <CollapsibleTrigger asChild>
          <Button variant="ghost">Alerts</Button>
        </CollapsibleTrigger>
        <CollapsibleContent>0 rules</CollapsibleContent>
      </>
    ),
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Alerts" });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(within(canvasElement).getByText("0 rules")).toBeVisible();
  },
};
