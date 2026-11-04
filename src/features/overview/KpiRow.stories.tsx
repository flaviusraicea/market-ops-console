import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState, type ReactNode } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { dataset as ds, portfolioMay, withDataset } from "../../../.storybook/decorators";
import { LiveKpiRow } from "@/features/live/LiveIslands";
import { LiveProvider, useLiveState } from "@/features/live/LiveProvider";
import { KpiRow } from "./KpiRow";
import { applyLiveOverlay } from "@/lib/live";
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

/** Holds the live tick by hand: the provider loads the engine as it does on first activation, the button is the timer. */
function ManualTicks({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);
  return (
    <LiveProvider tick={tick}>
      <EngineReady>
        {(ready) => (
          <button type="button" disabled={!ready} onClick={() => setTick((t) => t + 1)}>
            Advance tick
          </button>
        )}
      </EngineReady>
      {children}
    </LiveProvider>
  );
}

function EngineReady({ children }: { children: (ready: boolean) => ReactNode }) {
  return <>{children(useLiveState().engine !== null)}</>;
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
      canvasElement.querySelector('[data-slot="kpi-headline"]')?.textContent?.trim() ?? "";
    const delta = () => canvasElement.querySelector('[data-slot="kpi-delta"]');
    // The drift is a few tenths of a percent, so the rounded portfolio headline may not move: the story checks
    // that the tiles are the ones computed from the drifted data, whatever they read.
    const ticks = 4;
    for (let i = 0; i < ticks; i++) await userEvent.click(advance);
    const expected = overviewVM(applyLiveOverlay(ds, ticks), portfolioMay).tiles[0]?.headline;
    await waitFor(() => expect(headline()).toBe(expected));
    // The delta's direction follows the sign of the figure it shows.
    const sign = delta()?.textContent?.trim().charAt(0);
    await expect(delta()).toHaveAttribute(
      "data-direction",
      sign === "+" ? "up" : sign === "−" ? "down" : "flat",
    );
  },
};
