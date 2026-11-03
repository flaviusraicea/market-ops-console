import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import { CommandPalette } from "./CommandPalette";

const meta = {
  title: "features/palette/CommandPalette",
  component: CommandPalette,
  decorators: [withDataset],
  args: {
    open: true,
    onOpenChange: fn(),
    onSelect: fn(),
    onDismiss: fn(),
    mode: "overview",
    hasMarket: false,
    reducedMotion: false,
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

const headings = (dialog: HTMLElement) =>
  Array.from(dialog.querySelectorAll("[cmdk-group-heading]")).map((h) => h.textContent);

export const Open: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole("dialog", { name: "Command palette" });
    await expect(headings(dialog)).toEqual(["Markets13", "Regions4", "Views1", "Ask3", "Theme2"]);
    await expect(within(dialog).getByText("Switch to Analyst deep-dive")).toBeInTheDocument();

    const input = within(dialog).getByRole("combobox");
    await userEvent.type(input, "germ");
    await waitFor(() =>
      expect(
        within(dialog)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Go to GermanyEurope · off track", "Ask: Why did Germany dip?↵ asks"]),
    );

    await userEvent.keyboard("{Enter}");
    await expect(args.onSelect).not.toHaveBeenCalled(); // runs after the close, see onCloseAutoFocus
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

export const WithMarket: Story = {
  args: { hasMarket: true, mode: "analyst" },
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog", { name: "Command palette" });
    await expect(headings(dialog)).toContain("Products5");
    await expect(within(dialog).getByText("Switch to Executive overview")).toBeInTheDocument();
  },
};
