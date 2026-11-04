import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import { CommandPalette } from "./CommandPalette";

const meta = {
  title: "features/palette/CommandPalette",
  component: CommandPalette,
  decorators: [withDataset],
  // Stateful, so closing the palette runs the focus hand-off that calls onSelect.
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <CommandPalette
        {...args}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          args.onOpenChange(next);
        }}
      />
    );
  },
  args: {
    open: true,
    onOpenChange: fn(),
    onSelect: fn(),
    onDismiss: fn(),
    mode: "executive",
    hasMarket: false,
    reducedMotion: false,
  },
} satisfies Meta<typeof CommandPalette>;

export default meta;
type Story = StoryObj<typeof meta>;

const headings = (dialog: HTMLElement) =>
  Array.from(dialog.querySelectorAll("[cmdk-group-heading]")).map((h) => h.textContent);

/** The palette as it opens: every group with its count. It stays open, so the canvas shows it. */
export const Open: Story = {
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog", { name: "Command palette" });
    // The list mounts one commit after the dialog.
    await waitFor(() =>
      expect(headings(dialog)).toEqual(["Markets13", "Regions4", "Views1", "Ask3", "Theme2"]),
    );
    await expect(within(dialog).getByText("Switch to Analyst deep-dive")).toBeInTheDocument();
  },
};

/** Typing narrows the list, Enter chooses: the palette closes and hands the choice to onSelect. */
export const SelectsGermany: Story = {
  play: async ({ args }) => {
    const dialog = await within(document.body).findByRole("dialog", { name: "Command palette" });
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
    await waitFor(() =>
      expect(args.onSelect).toHaveBeenCalledWith({ kind: "market", marketId: "de" }),
    );
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
  },
};

export const WithMarket: Story = {
  args: { hasMarket: true, mode: "analyst" },
  play: async () => {
    const dialog = await within(document.body).findByRole("dialog", { name: "Command palette" });
    await waitFor(() => expect(headings(dialog)).toContain("Products5"));
    await expect(within(dialog).getByText("Switch to Executive overview")).toBeInTheDocument();
  },
};
