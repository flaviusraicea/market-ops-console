import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

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

export const TabularHeadlines: Story = {
  args: {
    label: "PORTFOLIO REVENUE",
    headline: "$22.85M",
    delta: { direction: "up", value: "+7.3%", comparison: "vs May 2025" },
    provenance: "Source · data.json",
  },
  play: async ({ canvasElement }) => {
    // Storybook has no next/font, so only the declared features are asserted here; the measured
    // width match for the real Source Serif 4 is in tests/e2e/breadcrumb-and-legend.spec.ts.
    const head = canvasElement.querySelector<HTMLElement>('[data-slot="kpi-headline"]')!;
    const style = getComputedStyle(head);
    await expect(style.fontVariantNumeric).toContain("tabular-nums");
    await expect(style.fontVariantNumeric).toContain("lining-nums");
    await expect(style.fontWeight).toBe("600");
    await expect(style.fontFamily).toContain("Georgia");
  },
};

export const Flat: Story = {
  args: {
    label: "NEEDS ATTENTION",
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
    infoLabel: "About forecast attainment",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.tab();
    await expect(c.getByRole("button", { name: "About forecast attainment" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(await within(document.body).findByRole("dialog")).toHaveTextContent(
      "Derived · sum of series",
    );
  },
};

export const Strip: Story = {
  args: {
    variant: "strip",
    label: "PORTFOLIO REVENUE",
    headline: "$22.85M",
    delta: { direction: "up", value: "+7.3%", comparison: "vs May 2025" },
    provenance: "Derived · sum of series",
  },
  play: async ({ canvasElement }) => {
    const delta = canvasElement.querySelector('[data-slot="kpi-delta"]')!;
    await expect(delta).toHaveTextContent("+7.3% vs May 2025");
    // The strip says its provenance once, below the row; the cell carries none of its own.
    await expect(within(canvasElement).queryByText("Derived · sum of series")).toBeNull();
    await expect(canvasElement.querySelector("[title]")).toBeNull();
  },
};

/** At a market or product the fourth tile is its status: the shared badge, with a one-line caption. */
export const Status: Story = {
  args: {
    label: "STATUS",
    headline: "Off track",
    status: "off_track",
    delta: { direction: "flat", value: "Attainment 92.0% · Growth -1.2%", comparison: "" },
    provenance: "Source · data.json",
  },
  decorators: [
    (Story) => (
      <div className="w-56 p-4">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="status-badge"]')).not.toBeNull();
    const caption = canvasElement.querySelector('[data-slot="kpi-delta"]')!;
    await expect(caption).toHaveAttribute("title", "Attainment 92.0% · Growth -1.2%");
    await expect(caption.getBoundingClientRect().height).toBeLessThanOrEqual(18);
  },
};
