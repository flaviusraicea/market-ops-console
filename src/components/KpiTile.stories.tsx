import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { KpiTile } from "./KpiTile";

const meta = {
  title: "components/KpiTile",
  component: KpiTile,
  decorators: [
    (Story) => (
      <div className="max-w-xs p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: {
    label: "PORTFOLIO REVENUE",
    headline: "$22.85M",
    delta: { direction: "up", value: "+7.3%", comparison: "vs May 2025" },
    provenance: "Source · data.json",
  },
  play: async ({ canvasElement }) => {
    const delta = canvasElement.querySelector('[data-slot="kpi-delta"]')!;
    await expect(delta).toHaveTextContent("+7.3% vs May 2025");
    await expect(within(delta as HTMLElement).getByText("+7.3%")).toHaveClass("text-ok-text");
  },
};

export const Negative: Story = {
  args: {
    label: "GERMANY REVENUE",
    headline: "$1.68M",
    delta: { direction: "down", value: "−9.7%", comparison: "vs May 2025" },
    provenance: "Source · data.json",
  },
  play: async ({ canvasElement }) => {
    const headline = canvasElement.querySelector('[data-slot="kpi-headline"]')!;
    await expect(headline.className).not.toMatch(/text-(ok|bad|warn)-text/);
    const delta = canvasElement.querySelector('[data-slot="kpi-delta"]')!;
    const value = within(delta as HTMLElement).getByText(/^−/);
    await expect(value).toHaveClass("text-bad-text");
    await expect(value.textContent?.startsWith("−")).toBe(true);
  },
};

export const Flat: Story = {
  args: {
    label: "MARKETS NEEDING ATTENTION",
    headline: "6 of 13",
    delta: { direction: "flat", value: "4 at risk · 2 off track", comparison: "" },
    provenance: "Source · data.json",
  },
  play: async ({ canvasElement }) => {
    const delta = canvasElement.querySelector('[data-slot="kpi-delta"]')!;
    await expect(delta.querySelector("svg")).toHaveClass("lucide-minus");
    await expect(within(delta as HTMLElement).getByText("4 at risk · 2 off track")).toHaveClass(
      "text-ink-2",
    );
  },
};

export const Derived: Story = {
  args: {
    label: "FORECAST ATTAINMENT",
    headline: "100.4%",
    delta: { direction: "up", value: "+$0.10M", comparison: "vs forecast" },
    provenance: "Derived · sum of series",
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Derived · sum of series")).toBeVisible();
  },
};
