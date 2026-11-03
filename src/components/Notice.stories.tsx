import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Button } from "@/components/ui/button";
import { Notice } from "./Notice";

const meta = {
  title: "components/Notice",
  component: Notice,
  decorators: [
    (Story) => (
      <div className="max-w-[380px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Notice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Error: Story = {
  args: {
    title: "Request failed",
    children: "The assistant could not answer. Nothing was changed.",
    actions: <Button variant="secondary">Retry</Button>,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("alert")).toHaveTextContent("Request failed");
  },
};

export const Neutral: Story = {
  args: {
    tone: "neutral",
    title: "Read-only for Executives.",
    children: "Switch to Analyst to edit rules.",
    actions: <Button variant="ghost">Switch to Analyst</Button>,
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("note")).toHaveTextContent(
      "Read-only for Executives.",
    );
  },
};

export const Rollback: Story = {
  args: {
    title: "Couldn’t save",
    children:
      "Your thresholds were restored to the last saved values (growth below 0%, attainment below 95%).",
    actions: (
      <>
        <Button variant="secondary">Try again</Button>
        <Button variant="ghost">Dismiss</Button>
      </>
    ),
  },
};

export const TitleOnly: Story = { args: { title: "Something went wrong" } };
