import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { LineChart, LineChartTable, type LineAnomaly, type LinePoint } from "./LineChart";
import { ViewAsTable } from "./ViewAsTable";

// Germany, Jun 2024 to May 2026, as lineChartVM produces it.
const points: LinePoint[] = [
  {
    period: "2024-06",
    label: "Jun 24",
    name: "Jun 2024",
    actual: 1956625,
    forecast: 2149129,
    priorYear: 2029627,
    attainment: 91,
  },
  {
    period: "2024-07",
    label: "Jul 24",
    name: "Jul 2024",
    actual: 1992713,
    forecast: 2175143,
    priorYear: 2123955,
    attainment: 91.6,
  },
  {
    period: "2024-08",
    label: "Aug 24",
    name: "Aug 2024",
    actual: 2087070,
    forecast: 2279051,
    priorYear: 2114163,
    attainment: 91.6,
  },
  {
    period: "2024-09",
    label: "Sep 24",
    name: "Sep 2024",
    actual: 2078371,
    forecast: 2258500,
    priorYear: 2174435,
    attainment: 92,
  },
  {
    period: "2024-10",
    label: "Oct 24",
    name: "Oct 2024",
    actual: 2102735,
    forecast: 2314668,
    priorYear: 2136497,
    attainment: 90.8,
  },
  {
    period: "2024-11",
    label: "Nov 24",
    name: "Nov 2024",
    actual: 1981259,
    forecast: 2157948,
    priorYear: 2044281,
    attainment: 91.8,
  },
  {
    period: "2024-12",
    label: "Dec 24",
    name: "Dec 2024",
    actual: 1889172,
    forecast: 2047249,
    priorYear: 2020056,
    attainment: 92.3,
  },
  {
    period: "2025-01",
    label: "Jan 25",
    name: "Jan 2025",
    actual: 1800708,
    forecast: 1954532,
    priorYear: 1892908,
    attainment: 92.1,
  },
  {
    period: "2025-02",
    label: "Feb 25",
    name: "Feb 2025",
    actual: 1797459,
    forecast: 1959829,
    priorYear: 1808863,
    attainment: 91.7,
  },
  {
    period: "2025-03",
    label: "Mar 25",
    name: "Mar 2025",
    actual: 1757641,
    forecast: 1918465,
    priorYear: 1828575,
    attainment: 91.6,
  },
  {
    period: "2025-04",
    label: "Apr 25",
    name: "Apr 2025",
    actual: 1793376,
    forecast: 1936175,
    priorYear: 1790807,
    attainment: 92.6,
  },
  {
    period: "2025-05",
    label: "May 25",
    name: "May 2025",
    actual: 1857237,
    forecast: 2031775,
    priorYear: 1907200,
    attainment: 91.4,
  },
  {
    period: "2025-06",
    label: "Jun 25",
    name: "Jun 2025",
    actual: 1914010,
    forecast: 2088787,
    priorYear: 1956625,
    attainment: 91.6,
  },
  {
    period: "2025-07",
    label: "Jul 25",
    name: "Jul 2025",
    actual: 1999930,
    forecast: 2167346,
    priorYear: 1992713,
    attainment: 92.3,
  },
  {
    period: "2025-08",
    label: "Aug 25",
    name: "Aug 2025",
    actual: 2074059,
    forecast: 2264125,
    priorYear: 2087070,
    attainment: 91.6,
  },
  {
    period: "2025-09",
    label: "Sep 25",
    name: "Sep 2025",
    actual: 2024639,
    forecast: 2221322,
    priorYear: 2078371,
    attainment: 91.1,
  },
  {
    period: "2025-10",
    label: "Oct 25",
    name: "Oct 2025",
    actual: 1967231,
    forecast: 2132078,
    priorYear: 2102735,
    attainment: 92.3,
  },
  {
    period: "2025-11",
    label: "Nov 25",
    name: "Nov 2025",
    actual: 1944465,
    forecast: 2117386,
    priorYear: 1981259,
    attainment: 91.8,
  },
  {
    period: "2025-12",
    label: "Dec 25",
    name: "Dec 2025",
    actual: 1869549,
    forecast: 2016786,
    priorYear: 1889172,
    attainment: 92.7,
  },
  {
    period: "2026-01",
    label: "Jan 26",
    name: "Jan 2026",
    actual: 1727009,
    forecast: 1864685,
    priorYear: 1800708,
    attainment: 92.6,
  },
  {
    period: "2026-02",
    label: "Feb 26",
    name: "Feb 2026",
    actual: 1664879,
    forecast: 1828243,
    priorYear: 1797459,
    attainment: 91.1,
  },
  {
    period: "2026-03",
    label: "Mar 26",
    name: "Mar 2026",
    actual: 1211930,
    forecast: 1314025,
    priorYear: 1757641,
    attainment: 92.2,
  },
  {
    period: "2026-04",
    label: "Apr 26",
    name: "Apr 2026",
    actual: 1657974,
    forecast: 1797590,
    priorYear: 1793376,
    attainment: 92.2,
  },
  {
    period: "2026-05",
    label: "May 26",
    name: "May 2026",
    actual: 1676586,
    forecast: 1817644,
    priorYear: 1857237,
    attainment: 92.2,
  },
];
const anomalies: LineAnomaly[] = [
  {
    period: "2026-03",
    index: 21,
    momPct: -27.2,
    label: "−27% vs Feb",
    ariaLabel: "Anomaly: March 2026 revenue fell 27 percent versus February",
  },
];
const title = "Germany · Revenue vs forecast vs prior year";
const desc =
  "Line chart of Germany monthly revenue from June 2024 to May 2026. Table available via View as table.";

const meta = {
  title: "components/charts/LineChart",
  component: LineChart,
  decorators: [
    (Story) => (
      <div className="max-w-3xl p-4">
        <Story />
      </div>
    ),
  ],
  args: { points, anomalies, selectedPeriod: "2026-05", title, desc, onPeriod: fn() },
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Germany: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const svg = await canvas.findByRole("group", { name: title });
    const dash = (s: string) =>
      svg.querySelector(`path[data-series="${s}"]`)?.getAttribute("stroke-dasharray");
    await expect(dash("forecast")).toBe("4 4");
    await expect(dash("priorYear")).toBe("1 3");
    await expect(dash("actual")).toBeNull();
    await expect(
      canvas.getByRole("button", {
        name: "Anomaly: March 2026 revenue fell 27 percent versus February",
      }),
    ).toBeVisible();
    // The label sits clear of the marker: their bounding boxes do not intersect.
    const label = canvasElement
      .querySelector('[data-slot="anomaly-label"]')!
      .getBoundingClientRect();
    const marker = canvas
      .getByRole("button", { name: /Anomaly: March 2026/ })
      .querySelector("circle:last-of-type")!
      .getBoundingClientRect();
    const overlap =
      label.left < marker.right &&
      label.right > marker.left &&
      label.top < marker.bottom &&
      label.bottom > marker.top;
    await expect(overlap).toBe(false);
    const cursor = canvas.getByRole("slider", { name: "Month" });
    cursor.focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}{ArrowLeft}");
    await waitFor(() => expect(canvas.getByRole("tooltip")).toHaveTextContent("Feb 2026"));
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(canvas.getByRole("tooltip")).toHaveTextContent("Mar 2026"));
    await expect(canvas.getByRole("tooltip")).toHaveTextContent("Actual$1.21M");
    await userEvent.keyboard("{Enter}");
    await expect(args.onPeriod).toHaveBeenCalledWith("2026-03");
  },
};

export const ViewAsTableState: Story = {
  render: () => (
    <ViewAsTable
      subject="the line chart"
      chart={
        <LineChart
          points={points}
          anomalies={anomalies}
          selectedPeriod="2026-05"
          title={title}
          desc={desc}
          onPeriod={() => {}}
        />
      }
      table={<LineChartTable caption={title} points={points} anomalies={anomalies} />}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^View as table/ }));
    await expect(canvas.getAllByRole("row")).toHaveLength(25);
    await expect(canvas.getByText("Anomaly")).toBeInTheDocument();
  },
};
