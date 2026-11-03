import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";
import type { LiveEngine } from "@/features/live/engine";
import { LiveKpiRow } from "@/features/live/LiveIslands";
import { LiveStateProvider } from "@/features/live/LiveProvider";
import { KpiRow } from "./KpiRow";
import { overviewVM } from "./viewModel";

const meta = {
  title: "features/overview/KpiRow",
  component: KpiRow,
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { tiles: overviewVM(ds, portfolioMay).tiles },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-slot="kpi-headline"]')).toHaveLength(4);
    await expect(within(canvasElement).getByText(/PORTFOLIO REVENUE/i)).toBeVisible();
  },
};

/** Drives the live tick by hand: the engine loads as it does on first activation, and the button is the timer. */
function ManualTicks({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  const [engine, setEngine] = useState<LiveEngine | null>(null);
  useEffect(() => {
    void import("@/features/live/engine").then((m) => setEngine(m.engine));
  }, []);
  const dataset = useMemo(
    () => (engine && tick > 0 ? engine.overlay(engine.full, tick) : null),
    [engine, tick],
  );
  return (
    <LiveStateProvider
      value={{
        live: true,
        tick,
        updatedAt: null,
        tweening: false,
        dataset,
        engine,
        setLive: () => {},
      }}
    >
      <button type="button" disabled={!engine} onClick={() => setTick((t) => t + 1)}>
        Advance tick
      </button>
      {children}
    </LiveStateProvider>
  );
}

export const Live: Story = {
  decorators: [withDataset],
  render: (args) => (
    <ManualTicks>
      <LiveKpiRow tiles={args.tiles} />
    </ManualTicks>
  ),
  args: { tiles: overviewVM(ds, portfolioMay).tiles },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const advance = canvas.getByRole("button", { name: "Advance tick" });
    await waitFor(() => expect(advance).toBeEnabled());
    const headline = () =>
      canvasElement.querySelector('[data-slot="kpi-headline"]')?.textContent ?? "";
    const delta = () => canvasElement.querySelector('[data-slot="kpi-delta"]');
    const before = headline();
    await userEvent.click(advance);
    await userEvent.click(advance);
    await userEvent.click(advance);
    await waitFor(() => expect(headline()).not.toBe(before));
    // The delta's direction follows the sign of the figure it shows.
    const sign = delta()?.textContent?.trim().charAt(0);
    await expect(delta()).toHaveAttribute(
      "data-direction",
      sign === "+" ? "up" : sign === "−" ? "down" : "flat",
    );
  },
};
