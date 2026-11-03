import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";

import { FactsTable } from "./FactsTable";
import { factsVM } from "./viewModel";

const meta = {
  title: "features/analyst/FactsTable",
  component: FactsTable,
  decorators: [withDataset],
  globals: { density: "analyst" },
} satisfies Meta<typeof FactsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllFacts: Story = {
  args: { facts: factsVM(ds, { ...portfolioMay, mode: "analyst", facts: true }) },
  parameters: { nuqs: { searchParams: "?mode=analyst&facts=1" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const scroller = c.getByRole("region", { name: "All facts" });
    await expect(c.getByRole("table")).toHaveAttribute("aria-rowcount", "1561");
    // 1,560 facts, but only the rows near the viewport are in the DOM.
    await expect(canvasElement.querySelectorAll("tr").length).toBeLessThan(40);

    // Scrolling to the end brings the last row of data.json into the DOM.
    const last = ds.series.at(-1)!; // the dataset is never empty
    scroller.scrollTop = scroller.scrollHeight;
    await waitFor(() => {
      const row = canvasElement.querySelector('tr[aria-rowindex="1561"]');
      expect(row).not.toBeNull();
      expect(row).toHaveTextContent(last.period);
    });
    await expect(canvasElement.querySelectorAll("tr").length).toBeLessThan(40);

    // One sortable header at a time: ascending first, descending on the second activation.
    scroller.scrollTop = 0;
    const attainment = c.getByRole("button", { name: /^ATTAINMENT/i });
    const th = attainment.closest("th");
    await userEvent.click(attainment);
    await expect(th).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(attainment);
    await expect(th).toHaveAttribute("aria-sort", "descending");
    await expect(c.getByRole("button", { name: /^MARKET/i }).closest("th")).toHaveAttribute(
      "aria-sort",
      "none",
    );
  },
};

export const OneMarket: Story = {
  args: {
    facts: factsVM(ds, {
      ...portfolioMay,
      mode: "analyst",
      facts: true,
      region: "eu",
      market: "de",
    }),
  },
  parameters: { nuqs: { searchParams: "?mode=analyst&facts=1&market=de" } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("table")).toHaveAccessibleName(
      "120 of 1,560 facts",
    );
  },
};
