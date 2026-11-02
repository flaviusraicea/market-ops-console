import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { SourcesTable } from "./SourcesTable";

const meta = {
  title: "features/assistant/SourcesTable",
  component: SourcesTable,
  decorators: [
    (Story) => (
      <div className="max-w-[380px] rounded-card border border-ai-border bg-ai-bg p-4">
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
      },
      {
        claim: "Steepest drop in March",
        entity: "Germany",
        period: "2026-03",
        sourceValue: "$1.21M actual · 92.2% of forecast · −27% vs Feb (anomaly note)",
        assistant: "Steepest drop",
        disagreement: false,
        resolved: true,
      },
      {
        claim: "Decline across the portfolio",
        entity: "Germany · Veltrix",
        period: "2026-03",
        sourceValue: "$0.43M actual · 92.5% of forecast",
        assistant: "Across products",
        disagreement: false,
        resolved: true,
      },
    ],
    caption: "Source · data.json · Germany is Off track at 92.0% attainment for May 2026.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("row")).toHaveLength(4); // header + 3
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
      },
      {
        claim: "March dip",
        entity: "Germany",
        period: "2026-03",
        sourceValue: "$1.21M actual · 92.2% of forecast · −27% vs Feb (anomaly note)",
        assistant: "Sharp dip",
        disagreement: false,
        resolved: true,
      },
      {
        claim: "Italy at risk",
        entity: "Italy",
        period: "2026-05",
        sourceValue: "At risk · 93.0% attainment",
        assistant: "At risk",
        disagreement: false,
        resolved: true,
      },
      {
        claim: "Brazil at risk",
        entity: "Brazil",
        period: "2026-05",
        sourceValue: "At risk · 96.0% attainment",
        assistant: "At risk",
        disagreement: false,
        resolved: true,
      },
    ],
    caption:
      "The dashboard follows data.json. 4 markets are at risk and 2 are off track there; the assistant names 3.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("region", { name: "Sources table" });
    await expect(region).toHaveAttribute("tabindex", "0");
    await expect(canvas.getAllByRole("row")).toHaveLength(5);
    const row = canvas.getByRole("row", { name: /Germany at risk/ });
    await expect(row.querySelector("svg")).not.toBeNull();
    await expect(within(row).getByRole("cell", { name: "At risk" })).toHaveClass("text-warn-text");
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
      },
    ],
    caption: "Source · data.json",
  },
};
