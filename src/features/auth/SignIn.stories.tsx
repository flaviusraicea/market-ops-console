import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { SignIn } from "./SignIn";

const meta = {
  title: "features/auth/SignIn",
  component: SignIn,
  args: { onPick: fn() },
} satisfies Meta<typeof SignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Personas: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Sign in to Market Ops" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Continue with SSO (mocked)" })).toBeDisabled();
    await expect(canvas.getByText(/SSO is mocked for this assignment/)).toBeVisible();
    const analyst = canvas.getByRole("button", { name: /Sam Okafor/ });
    analyst.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onPick).toHaveBeenCalledWith("analyst");
    await userEvent.click(canvas.getByRole("button", { name: /Dana Whitfield/ }));
    await expect(args.onPick).toHaveBeenCalledWith("executive");
  },
};
