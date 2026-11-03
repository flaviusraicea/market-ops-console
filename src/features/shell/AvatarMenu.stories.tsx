import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { AvatarMenu } from "./AvatarMenu";

const meta = {
  title: "features/shell/AvatarMenu",
  component: AvatarMenu,
  decorators: [
    (Story) => (
      <div className="flex justify-end p-4">
        <Story />
      </div>
    ),
  ],
  args: { role: "executive", onSwitch: fn(), onSignOut: fn() },
} satisfies Meta<typeof AvatarMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = within(document.body);

export const Executive: Story = {
  play: async ({ canvasElement, args }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Signed in as Dana Whitfield, Executive role, alerts read-only. Account menu",
    });
    await userEvent.click(trigger);
    await expect(await body.findByText("dana.whitfield@example.com")).toBeVisible();
    // Both roles are listed; the current one is checked.
    await expect(body.getByRole("menuitemradio", { name: "Executive" })).toBeChecked();
    await expect(
      body.getByRole("menuitemradio", { name: "Switch role to Analyst (can edit alerts)" }),
    ).not.toBeChecked();
    await userEvent.click(
      body.getByRole("menuitemradio", { name: "Switch role to Analyst (can edit alerts)" }),
    );
    await expect(args.onSwitch).toHaveBeenCalledWith("analyst");
  },
};

export const Analyst: Story = {
  args: { role: "analyst" },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Signed in as Sam Okafor, Analyst role, can edit alerts. Account menu",
      }),
    );
    await expect(await body.findByRole("menuitemradio", { name: "Analyst" })).toBeChecked();
    await expect(
      body.getByRole("menuitemradio", { name: "Switch role to Executive (alerts read-only)" }),
    ).not.toBeChecked();
    await userEvent.click(body.getByRole("menuitem", { name: "Sign out" }));
    await expect(args.onSignOut).toHaveBeenCalled();
  },
};
