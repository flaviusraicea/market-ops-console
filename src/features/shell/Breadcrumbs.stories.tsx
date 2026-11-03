import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

const portfolio: Crumb = {
  label: "Portfolio",
  ctx: { region: undefined, market: undefined },
  href: "/",
};
const europe: Crumb = {
  label: "Europe",
  ctx: { region: "eu", market: undefined },
  href: "/?region=eu",
};
const germany: Crumb = {
  label: "Germany",
  ctx: { region: "eu", market: "de" },
  href: "/?region=eu&market=de",
};

const meta = {
  title: "features/shell/Breadcrumbs",
  component: Breadcrumbs,
  decorators: [
    (Story) => (
      <div className="flex max-w-[480px] p-4">
        <Story />
      </div>
    ),
  ],
  args: { onNavigate: fn() },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  args: { trail: [portfolio] },
  play: async ({ canvasElement }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Drill path" });
    await expect(within(nav).getByText("Portfolio")).toHaveAttribute("aria-current", "page");
  },
};

export const Market: Story = {
  args: { trail: [portfolio, europe, germany] },
  play: async ({ canvasElement, args }) => {
    const nav = within(canvasElement).getByRole("navigation", { name: "Drill path" });
    await userEvent.click(within(nav).getByRole("link", { name: "Europe" }));
    await expect(args.onNavigate).toHaveBeenCalledTimes(1);
    await expect(within(nav).getByText("Germany")).toHaveAttribute("aria-current", "page");
  },
};
