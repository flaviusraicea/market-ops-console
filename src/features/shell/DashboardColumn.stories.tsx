import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useRef } from "react";

import { NavigationProvider, useNavigationTransition } from "@/lib/context/navigation";
import { withDataset } from "../../../.storybook/decorators";
import { DashboardColumn } from "./DashboardColumn";

/** Holds the shared transition open until Finish is pressed, the way a slow server render would. */
function SlowDrill() {
  const [, start] = useNavigationTransition();
  const release = useRef<() => void>(() => undefined);
  return (
    <>
      <button
        type="button"
        onClick={() =>
          start(async () => {
            await new Promise<void>((resolve) => {
              release.current = resolve;
            });
          })
        }
      >
        Start
      </button>
      <button type="button" onClick={() => release.current()}>
        Finish
      </button>
      <DashboardColumn>
        <p>Dashboard content</p>
      </DashboardColumn>
    </>
  );
}

const meta = {
  title: "features/shell/DashboardColumn",
  component: DashboardColumn,
  args: { children: null },
  decorators: [withDataset],
  parameters: { nuqs: { searchParams: "" } },
} satisfies Meta<typeof DashboardColumn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  render: () => (
    <NavigationProvider>
      <SlowDrill />
    </NavigationProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const section = canvas.getByRole("region", { name: "Dashboard" });
    await expect(section).toHaveAttribute("data-pending", "false");

    await userEvent.click(canvas.getByRole("button", { name: "Start" }));
    await waitFor(() => expect(section).toHaveAttribute("data-pending", "true"));
    await waitFor(() => expect(getComputedStyle(section).opacity).toBe("0.6"));

    await userEvent.click(canvas.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(section).toHaveAttribute("data-pending", "false"));
    await waitFor(() => expect(getComputedStyle(section).opacity).toBe("1"));
  },
};

export const PendingReducedMotion: Story = {
  ...Pending,
  globals: { reducedMotion: "on" },
  play: async ({ canvasElement }) => {
    const section = within(canvasElement).getByRole("region", { name: "Dashboard" });
    await expect(getComputedStyle(section).transitionDuration).toBe("0s");
  },
};
