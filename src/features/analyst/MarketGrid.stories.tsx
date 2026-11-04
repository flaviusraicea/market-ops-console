import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";

import { MarketGrid } from "./MarketGrid";
import { analystVM } from "./viewModel";

const base = { ...portfolioMay, mode: "analyst" } as const;

const meta = {
  title: "features/analyst/MarketGrid",
  component: MarketGrid,
  decorators: [withDataset],
  globals: { density: "analyst" },
} satisfies Meta<typeof MarketGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Markets: Story = {
  args: { grid: analystVM(ds, base).grid },
  parameters: { nuqs: { searchParams: "?mode=analyst" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table")).toBeVisible();
    // Sorting by a header is one control, and the column says which way it is sorted.
    const header = c.getByRole("button", { name: /^ATTAINMENT/i });
    await userEvent.click(header);
    await expect(header.closest("th")).toHaveAttribute("aria-sort");
    // The name is the drill link, with the address the drill would write; the row itself is not focusable.
    const germany = c.getByRole("link", { name: "Germany" });
    await expect(germany).toHaveAttribute("href", "/?region=eu&market=de&mode=analyst");
    await expect(germany.closest("tr")).not.toHaveAttribute("tabindex");
  },
};

export const Products: Story = {
  args: { grid: analystVM(ds, { ...base, region: "eu", market: "de" }).grid },
  parameters: { nuqs: { searchParams: "?mode=analyst&region=eu&market=de" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("link", { name: "Veltrix" })).toHaveAttribute(
      "href",
      "/?region=eu&market=de&product=veltrix&mode=analyst",
    );
  },
};
