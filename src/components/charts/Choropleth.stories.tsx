import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { FeatureCollection } from "geojson";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Notice } from "@/components/Notice";
import geoJson from "../../../public/geo/markets.json";
import { Choropleth, type MarketValue } from "./Choropleth";
import { ViewAsTable } from "./ViewAsTable";

const realGeo = geoJson as FeatureCollection;

const square = (x: number, y: number, w: number, h: number) => ({
  type: "Polygon" as const,
  coordinates: [
    [
      [x, y],
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ],
  ],
});

const fixtureGeo: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "land" },
      geometry: { type: "MultiPolygon", coordinates: [[square(-20, -10, 60, 60).coordinates[0]!]] },
    },
    { type: "Feature", properties: { marketId: "de" }, geometry: square(6, 47, 9, 8) },
    { type: "Feature", properties: { marketId: "fr" }, geometry: square(-4, 42, 10, 9) },
  ],
};

const two: Record<string, MarketValue> = {
  de: {
    name: "Germany",
    value: 92.0,
    label: "92.0% attainment",
    status: "off_track",
    statusLabel: "Off track",
    display: "92.0%",
    revenue: "$1.68M",
  },
  fr: {
    name: "France",
    value: 104.5,
    label: "104.5% attainment",
    status: "on_track",
    statusLabel: "On track",
    display: "104.5%",
    revenue: "$1.52M",
  },
};

const meta = {
  title: "components/charts/Choropleth",
  component: Choropleth,
  decorators: [
    (Story) => (
      <div className="max-w-3xl p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    geo: fixtureGeo,
    values: two,
    metric: "attainment",
    metricLabel: "Attainment",
    periodLabel: "May 2026",
    onSelect: fn(),
  },
} satisfies Meta<typeof Choropleth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoMarkets: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const de = await canvas.findByRole("button", { name: "Germany, off track, 92.0% attainment" });
    const fr = canvas.getByRole("button", { name: "France, on track, 104.5% attainment" });
    await expect(de).toHaveAttribute("role", "button");

    // Land carries the dedicated token and the hairline outline in both themes.
    const land = canvasElement.querySelector('path[fill="var(--map-land)"]');
    await expect(land).not.toBeNull();
    await expect(land).toHaveAttribute("stroke", "var(--border)");
    await expect(land).toHaveAttribute("stroke-width", "0.5");

    // Alphabetical roving focus: France first, then Germany.
    await expect(fr).toHaveAttribute("tabindex", "0");
    await expect(de).toHaveAttribute("tabindex", "-1");
    fr.focus();
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(de).toHaveFocus());
    await expect(await canvas.findByRole("tooltip")).toHaveTextContent("Off track");

    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).toHaveBeenCalledWith("de");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByRole("tooltip")).not.toBeInTheDocument());
  },
};

const all: Record<string, MarketValue> = Object.fromEntries(
  realGeo.features
    .map((f) => f.properties?.["marketId"] as string | undefined)
    .filter((id): id is string => !!id)
    .map((id, i) => [
      id,
      {
        name: id.toUpperCase(),
        value: 90 + i,
        label: `${90 + i}.0% attainment`,
        status: i % 3 === 0 ? "off_track" : i % 3 === 1 ? "at_risk" : "on_track",
        statusLabel: i % 3 === 0 ? "Off track" : i % 3 === 1 ? "At risk" : "On track",
        display: `${90 + i}.0%`,
        revenue: "$1.00M",
      } satisfies MarketValue,
    ]),
);

export const Portfolio: Story = {
  args: { geo: realGeo, values: all, selected: "ca" },
  play: async ({ canvasElement }) => {
    const svg = await within(canvasElement).findByRole("group", { name: "Markets by Attainment" });
    await expect(svg.querySelector("desc")).toHaveTextContent(
      "Choropleth of 13 markets coloured by attainment for May 2026.",
    );
    await expect(within(canvasElement).getAllByRole("button")).toHaveLength(13);
  },
};

export const ByStatus: Story = {
  args: { geo: realGeo, values: all, scheme: "status" },
  play: async ({ canvasElement }) => {
    const svg = await within(canvasElement).findByRole("group", { name: "Markets by status" });
    await expect(svg.querySelector("desc")).toHaveTextContent("coloured by status for May 2026.");
    const fills = within(canvasElement)
      .getAllByRole("button")
      .map((b) => b.getAttribute("fill"));
    await expect(new Set(fills)).toEqual(
      new Set(["var(--ok-mark)", "var(--warn-mark)", "var(--bad-mark)"]),
    );
  },
};

export const Unavailable: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Notice title="Map unavailable">The market table below has the same data.</Notice>
      <ViewAsTable
        subject="the markets map" forced
        chart={null}
        table={
          <table>
            <caption className="sr-only">Markets</caption>
            <thead>
              <tr>
                <th scope="col">Market</th>
                <th scope="col">Attainment</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Germany</td>
                <td>92.0%</td>
              </tr>
            </tbody>
          </table>
        }
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Map unavailable")).toBeVisible();
    await expect(canvas.getByRole("table")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /view as/i })).not.toBeInTheDocument();
  },
};
