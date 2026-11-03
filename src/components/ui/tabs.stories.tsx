import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "components/ui/Tabs",
  component: Tabs,
  decorators: [
    (Story) => (
      <div className="max-w-[420px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    defaultValue: "a",
    children: (
      <>
        <TabsList aria-label="View">
          <TabsTrigger value="a">Sources</TabsTrigger>
          <TabsTrigger value="b">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Cited rows</TabsContent>
        <TabsContent value="b">Reviewer notes</TabsContent>
      </>
    ),
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    c.getByRole("tab", { name: "Sources" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    await expect(c.getByRole("tabpanel")).toHaveTextContent("Reviewer notes");
  },
};
