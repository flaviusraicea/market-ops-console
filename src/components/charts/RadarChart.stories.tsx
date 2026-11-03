import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { RadarChart, RadarChartTable, type RadarSeries } from "./RadarChart";
import { ViewAsTable } from "./ViewAsTable";

const series: RadarSeries[] = [
  {
    id: "fr",
    name: "France",
    color: "--cat-1",
    values: [0.3520000000000005, 1, 0.8399999999999999, 0.7, 1],
    raw: ["96.4%", "+11.6%", "25.7%", "+3.9%", "96.4%"],
    selected: false,
  },
  {
    id: "de",
    name: "Germany",
    color: "--cat-2",
    values: [0, 0, 0, 0, 0],
    raw: ["92.0%", "−9.7%", "8.9%", "+1.1%", "92.0%"],
    selected: false,
  },
  {
    id: "it",
    name: "Italy",
    color: "--cat-3",
    values: [0.08, 0.46948356807511743, 1, 0.025, 0.2272727],
    raw: ["93.0%", "+0.3%", "28.9%", "+1.2%", "93.0%"],
    selected: false,
  },
  {
    id: "es",
    name: "Spain",
    color: "--cat-4",
    values: [1, 0.2394366, 0.46, 0.075, 0.7954545],
    raw: ["104.5%", "−4.6%", "18.1%", "+1.4%", "95.5%"],
    selected: false,
  },
  {
    id: "gb",
    name: "United Kingdom",
    color: "--cat-5",
    values: [0.184, 0.8685446, 0.255, 1, 0.5227273],
    raw: ["94.3%", "+8.8%", "14.0%", "+5.1%", "94.3%"],
    selected: false,
  },
];
const axes = [
  "Attainment",
  "Growth YoY",
  "Share (given)",
  "Month on month",
  "Forecast accuracy",
] as const;
const title = "Markets · Europe compared";
const desc =
  "Radar chart of 5 markets on Attainment, Growth YoY, Share (given), Month on month, Forecast accuracy.";

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
    // Five axes: one label each, plus the two rings labelled 0.5 and 1.0.
    for (const axis of axes)
      await expect(svg.querySelector(`[data-axis="${axis}"]`)).not.toBeNull();
    await expect(within(svg as HTMLElement).getByText("0.5")).toBeInTheDocument();
    await expect(within(svg as HTMLElement).getByText("1.0")).toBeInTheDocument();
    // Each series polygon has five vertices.
    await expect(svg.querySelectorAll('circle[role="img"]')).toHaveLength(25);
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
    await userEvent.click(canvas.getByRole("button", { name: "View as table" }));
    await expect(canvas.getAllByRole("row")).toHaveLength(6);
  },
};
