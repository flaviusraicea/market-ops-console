import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import data from "@/data/data.json";
import { parseDataset, type Context, type Period } from "@/domain";
import { withDataset } from "../../../.storybook/decorators";
import { TimeSeriesCard } from "./TimeSeriesCard";
import { analystVM } from "./viewModel";

const ds = parseDataset(data);
const germany: Context = {
  region: "eu",
  market: "de",
  period: "2026-05" as Period,
  mode: "analyst",
  metric: "attainment",
  basis: "month",
};
const product = ds.products[0];
const allProducts = analystVM(ds, germany).timeSeries;
const oneProduct = analystVM(ds, {
  ...germany,
  ...(product ? { product: product.id } : {}),
}).timeSeries;

/** Stands in for a context change: the same card gets the series of one product, and must patch in place. */
function Retargetable() {
  const [one, setOne] = useState(false);
  return (
    <div data-slot="dashboard" data-tween="true">
      <button type="button" onClick={() => setOne(true)}>
        Show one product
      </button>
      <TimeSeriesCard vm={one ? oneProduct : allProducts} />
    </div>
  );
}

function actualPath(root: HTMLElement): SVGPathElement {
  const found = root.querySelector('path[data-series="actual"]');
  if (!(found instanceof SVGPathElement)) throw new Error("no actual path");
  return found;
}

const meta = {
  title: "features/analyst/TimeSeriesCard",
  component: TimeSeriesCard,
  decorators: [withDataset],
  args: { vm: allProducts },
  parameters: { nuqs: { searchParams: "" } },
} satisfies Meta<typeof TimeSeriesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Month to another series on the real Germany data: the path node is kept and transitions `d`. */
export const Germany: Story = {
  render: () => <Retargetable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("group", { name: allProducts.chartTitle });
    const before = actualPath(canvasElement);
    const dBefore = before.getAttribute("d");
    await expect(getComputedStyle(before).transitionProperty).toBe("d");
    await expect(getComputedStyle(before).transitionDuration).toBe("0.24s");

    await userEvent.click(canvas.getByRole("button", { name: "Show one product" }));
    await waitFor(() => expect(actualPath(canvasElement).getAttribute("d")).not.toBe(dBefore));
    await expect(actualPath(canvasElement)).toBe(before);
  },
};

export const GermanyReducedMotion: Story = {
  render: () => <Retargetable />,
  globals: { reducedMotion: "on" },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("group", { name: allProducts.chartTitle });
    await expect(getComputedStyle(actualPath(canvasElement)).transitionDuration).toBe("0s");
  },
};

/** Outside a context change (a resize, a theme switch) the paths do not tween. */
export const NoTweenOutsideAContextChange: Story = {
  render: () => (
    <div data-slot="dashboard" data-tween="false">
      <TimeSeriesCard vm={allProducts} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("group", { name: allProducts.chartTitle });
    await expect(getComputedStyle(actualPath(canvasElement)).transitionProperty).toBe("all");
  },
};
