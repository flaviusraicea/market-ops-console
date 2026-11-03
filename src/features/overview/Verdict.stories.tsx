import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { portfolioMay } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { Verdict } from "./Verdict";
import { verdictVM } from "./viewModel";

const ds = parseDataset(data);

const meta = {
  title: "features/overview/Verdict",
  component: Verdict,
} satisfies Meta<typeof Verdict>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { verdict: verdictVM(ds, portfolioMay) },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { level: 2 });
    await expect(h).toHaveTextContent(
      "Portfolio is on track at 100.4% of forecast, up 7.3% on last year. Six markets need attention.",
    );
  },
};

export const Germany: Story = {
  args: { verdict: verdictVM(ds, { ...portfolioMay, region: "eu", market: "de" }) },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { level: 2 });
    await expect(h).toHaveTextContent(
      "Germany is off track at 92.0% of forecast, down 9.7% on last year. Revenue fell 27.2% in March.",
    );
  },
};

const allOnTrack = {
  ...ds,
  markets: ds.markets.map((m) => ({ ...m, kpis: { ...m.kpis, status: "on_track" as const } })),
};

export const AllOnTrack: Story = {
  args: { verdict: verdictVM(allOnTrack, portfolioMay) },
  play: async ({ canvasElement }) => {
    const h = within(canvasElement).getByRole("heading", { level: 2 });
    await expect(h).toHaveTextContent("No markets need attention.");
  },
};
