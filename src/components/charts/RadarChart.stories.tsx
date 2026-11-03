import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { RadarChart, RadarChartTable, type RadarSeries } from "./RadarChart";
import { ViewAsTable } from "./ViewAsTable";

/** Europe, May 2026, as the analyst view model computes it (values scaled with the 15% axis pad). */
const series: RadarSeries[] = [
  {
    id: "fr",
    name: "France",
    color: "--cat-1",
    values: [0.3862, 0.8846, 0.7615, 0.6538, 0.8846],
    raw: ["96.4%", "+11.6%", "25.7%", "+3.9%", "+10.8%"],
    selected: false,
  },
  {
    id: "de",
    name: "Germany",
    color: "--cat-2",
    values: [0.1154, 0.1154, 0.1154, 0.1154, 0.1154],
    raw: ["92.0%", "−9.7%", "8.9%", "+1.1%", "−9.9%"],
    selected: false,
  },
  {
    id: "it",
    name: "Italy",
    color: "--cat-3",
    values: [0.1769, 0.4765, 0.8846, 0.1346, 0.513],
    raw: ["93.0%", "+0.3%", "28.9%", "+1.2%", "+0.8%"],
    selected: false,
  },
  {
    id: "es",
    name: "Spain",
    color: "--cat-4",
    values: [0.8846, 0.2996, 0.4692, 0.1731, 0.3198],
    raw: ["104.5%", "−4.6%", "18.1%", "+1.4%", "−4.4%"],
    selected: false,
  },
  {
    id: "gb",
    name: "United Kingdom",
    color: "--cat-5",
    values: [0.2569, 0.7835, 0.3115, 0.8846, 0.8066],
    raw: ["94.3%", "+8.8%", "14.0%", "+5.1%", "+8.7%"],
    selected: false,
  },
];
const axes = ["Attainment", "Growth YoY", "Share (given)", "Month on month", "Units YoY"] as const;
const title = "Markets · Europe compared";
const desc =
  "Radar chart of 5 markets on Attainment, Growth YoY, Share (given), Month on month, Units YoY.";

const meta = {
  title: "components/charts/RadarChart",
  component: RadarChart,
  decorators: [
    (Story) => (
      <div className="max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
  args: { axes, series, title, desc },
} satisfies Meta<typeof RadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Europe: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const svg = await canvas.findByRole("group", { name: title });
    // Five axes: one label each. The two rings carry no numbers, which would read as values.
    for (const axis of axes)
      await expect(svg.querySelector(`[data-axis="${axis}"]`)).not.toBeNull();
    await expect(within(svg as HTMLElement).queryByText("0.5")).toBeNull();
    // Each series polygon has five vertices.
    await expect(svg.querySelectorAll('circle[role="img"]')).toHaveLength(25);
  },
};

/** A market with no Units YoY: its outline skips that axis, no dot is drawn, and the axis label and spoke go quiet. */
export const MissingValue: Story = {
  args: {
    series: series.map((s) =>
      s.id === "gb"
        ? {
            ...s,
            values: s.values.map((v, a) => (a === 4 ? null : v)),
            raw: s.raw.map((r, a) => (a === 4 ? "n/a" : r)),
          }
        : s,
    ),
  },
  play: async ({ canvasElement }) => {
    const svg = await within(canvasElement).findByRole("group", { name: title });
    // Twenty-four dots: the United Kingdom has four.
    await expect(svg.querySelectorAll('circle[role="img"]')).toHaveLength(24);
    await expect(svg.querySelector('[data-axis="Units YoY"]')).toHaveClass("fill-ink-muted");
  },
};

export const ViewAsTableState: Story = {
  render: () => (
    <ViewAsTable
      subject="the radar chart"
      chart={<RadarChart axes={axes} series={series} title={title} desc={desc} />}
      table={<RadarChartTable caption={title} axes={axes} series={series} />}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^View as table/ }));
    await expect(canvas.getAllByRole("row")).toHaveLength(6);
  },
};
