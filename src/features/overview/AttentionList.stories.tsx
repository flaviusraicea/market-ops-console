import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { AttentionList } from "./AttentionList";
import { attentionVM } from "./viewModel";

const ds = parseDataset(data);

const meta = {
  title: "features/overview/AttentionList",
  component: AttentionList,
  decorators: [withDataset],
  args: { onSelect: fn(), onAsk: fn() },
} satisfies Meta<typeof AttentionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { attention: attentionVM(ds, portfolioMay) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Ask why Germany dipped" }));
    await expect(args.onAsk).toHaveBeenCalledWith("Why did Germany's revenue dip?");
    await userEvent.click(canvas.getByRole("button", { name: "Spain" }));
    await expect(args.onSelect).toHaveBeenCalledWith("es");
    // The rising rows have no Ask why.
    await expect(canvas.getAllByRole("button", { name: /^Ask why/ })).toHaveLength(6);
  },
};

const allOnTrack = {
  ...ds,
  markets: ds.markets.map((m) => ({ ...m, kpis: { ...m.kpis, status: "on_track" as const } })),
};

export const Empty: Story = {
  args: { attention: attentionVM(allOnTrack, portfolioMay) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("All markets are on track.")).toBeVisible();
    await expect(canvas.queryAllByRole("button", { name: /^Ask why/ })).toHaveLength(0);
    await expect(canvas.getByText("Top movers · rising")).toBeVisible();
  },
};

export const Products: Story = {
  args: { attention: attentionVM(ds, { ...portfolioMay, region: "eu", market: "de" }) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Products" })).toBeVisible();
    await expect(canvas.getAllByRole("row")).toHaveLength(6);
  },
};
