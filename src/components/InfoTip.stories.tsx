import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { InfoTip } from "./InfoTip";

const meta = {
  title: "components/InfoTip",
  component: InfoTip,
  decorators: [
    (Story) => (
      <div className="flex justify-center p-16">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "About forecast attainment",
    children: "Revenue as a share of forecast for the period, derived from the series.",
  },
} satisfies Meta<typeof InfoTip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpensOnEnter: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "About forecast attainment" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(within(document.body).getByRole("dialog")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
    await expect(button).toHaveFocus();
  },
};

export const WithText: Story = {
  args: {
    label: "Status rule",
    text: "Status rule",
    children: "Off track when attainment is below 92.5%.",
  },
};
