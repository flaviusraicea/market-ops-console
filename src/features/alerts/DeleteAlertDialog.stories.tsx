import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";

import { DeleteAlertDialog } from "./DeleteAlertDialog";

const meta = {
  title: "features/alerts/DeleteAlertDialog",
  component: DeleteAlertDialog,
  args: {
    label: "Growth below 0% · Europe",
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof DeleteAlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(dialog.getByText("Delete this rule?")).toBeInTheDocument();
    await expect(
      dialog.getByText('"Growth below 0% · Europe" will stop being evaluated.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(dialog.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await expect(dialog.getByRole("button", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
  },
};
