import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { RadarChart, RadarChartTable, type RadarSeries } from "./RadarChart";
import { ViewAsTable } from "./ViewAsTable";

const series: RadarSeries[] = [
  {
    id: "fr",
    name: "France",
    color: "--cat-1",
    values: [0.3520000000000005, 1, 0.8399999999999999],
    raw: ["96.4%", "+11.6%", "25.7%"],
    selected: false,
  },
  {
    id: "de",
    name: "Germany",
    color: "--cat-2",
    values: [0, 0, 0],
    raw: ["92.0%", "−9.7%", "8.9%"],
    selected: false,
  },
  {
    id: "it",
    name: "Italy",
    color: "--cat-3",
    values: [0.08, 0.46948356807511743, 1],
    raw: ["93.0%", "+0.3%", "28.9%"],
    selected: false,
  },
  {
    id: "es",
    name: "Spain",
    color: "--cat-4",
    values: [1, 0.23943661971830987, 0.4600000000000001],
    raw: ["104.5%", "−4.6%", "18.1%"],
    selected: false,
  },
  {
    id: "gb",
    name: "United Kingdom",
    color: "--cat-5",
    values: [0.18399999999999977, 0.8685446009389672, 0.255],
    raw: ["94.3%", "+8.8%", "14.0%"],
    selected: false,
  },
];
const axes = ["Attainment", "Growth", "Share (given)"] as const;
const title = "Markets · Europe compared";
const desc = "Radar chart of 5 markets on Attainment, Growth, Share (given).";

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

export const Europe: Story = {};

export const ViewAsTableState: Story = {
  render: () => (
    <ViewAsTable
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
