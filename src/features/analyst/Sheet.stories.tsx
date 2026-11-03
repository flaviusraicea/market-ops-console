import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Sheet, SheetSection } from "./Sheet";

const meta = {
  title: "features/analyst/Sheet",
  component: Sheet,
  globals: { density: "analyst" },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <SheetSection
          eyebrow="Markets"
          subtitle="13 markets · May 2026"
          caption="Source · data.json"
        >
          <p>Grid goes here</p>
        </SheetSection>
        <SheetSection eyebrow="Map" subtitle="Markets by attainment">
          <p>Map goes here</p>
        </SheetSection>
      </>
    ),
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The eyebrow and subtitle name each section's landmark.
    await expect(within(canvasElement).getAllByRole("region")).toHaveLength(2);
  },
};
