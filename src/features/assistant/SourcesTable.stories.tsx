import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { SourcesTable } from "./SourcesTable";

const meta = {
  title: "features/assistant/SourcesTable",
  component: SourcesTable,
  decorators: [
    (Story) => (
      <div className="max-w-[380px] rounded-sheet border border-ai-border bg-ai-bg p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SourcesTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Rows are the output of sourcesRows() for each canned answer, written out so the story needs no data.
export const GermanyDip: Story = {
  args: {
    rows: [
      {
        claim: "Fell in early 2026",
        entity: "Germany",
        period: "2026-02",
        sourceValue: "$1.66M actual · 91.1% of forecast",
        assistant: "Revenue fell",
        disagreement: false,
        resolved: true,
        derived: false,
      },
      {
        claim: "Steepest drop in March",
        entity: "Germany",
        period: "2026-03",
        sourceValue: "$1.21M actual · 92.2% of forecast · −27% vs Feb (anomaly note)",
        assistant: "Steepest drop",
        disagreement: false,
        resolved: true,
        derived: false,
      },
      {
        claim: "Decline across the portfolio",
        entity: "Germany · Veltrix",
        period: "2026-03",
        sourceValue: "$427K actual · 92.5% of forecast",
        assistant: "Across products",
        disagreement: false,
        resolved: true,
        derived: false,
      },
    ],
    caption: "Sources · data.json · attainment as given · derived",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvasElement.querySelector("svg")).toBeNull();
  },
};

export const AtRisk: Story = {
  args: {
    rows: [
      {
        claim: "Germany at risk",
        entity: "Germany",
        period: "2026-05",
        sourceValue: "Off track · 92.0% attainment",
        assistant: "At risk",
        disagreement: true,
        resolved: true,
        derived: false,
      },
      {
        claim: "March dip",
        entity: "Germany",
        period: "2026-03",
        sourceValue: "$1.21M actual · 92.2% of forecast · −27% vs Feb (anomaly note)",
        assistant: "Sharp dip",
        disagreement: false,
        resolved: true,
        derived: false,
      },
      {
        claim: "Italy at risk",
        entity: "Italy",
        period: "2026-05",
        sourceValue: "At risk · 93.0% attainment",
        assistant: "At risk",
        disagreement: false,
        resolved: true,
        derived: false,
      },
      {
        claim: "Brazil at risk",
        entity: "Brazil",
        period: "2026-05",
        sourceValue: "At risk · 96.0% attainment",
        assistant: "At risk",
        disagreement: false,
        resolved: true,
        derived: false,
      },
    ],
    caption: "Sources · data.json · attainment as given · derived",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole("list", { name: "Sources" });
    const items = within(list).getAllByRole("listitem");
    await expect(items).toHaveLength(4);
    // Stacked items: nothing scrolls sideways in the panel.
    await expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const first = items[0]!;
    await expect(first.querySelector("svg")).not.toBeNull();
    await expect(within(first).getByText("At risk", { exact: true })).toHaveClass("text-warn-text");
    await expect(canvasElement.querySelectorAll("svg")).toHaveLength(1);
  },
};

export const Unresolved: Story = {
  args: {
    rows: [
      {
        claim: "Atlantis",
        entity: "Could not resolve",
        period: "—",
        sourceValue: "—",
        assistant: "—",
        disagreement: false,
        resolved: false,
        derived: false,
      },
    ],
    caption: "Sources · data.json · attainment as given",
  },
};
