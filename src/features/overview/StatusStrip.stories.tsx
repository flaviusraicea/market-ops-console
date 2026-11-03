import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { StatusStrip } from "./StatusStrip";
import { stripVM } from "./viewModel";

const ds = parseDataset(data);
/** A market chip, as opposed to a region heading button. */
const CHIP = /, (on track|at risk|off track)$/;

const meta = {
  title: "features/overview/StatusStrip",
  component: StatusStrip,
  decorators: [withDataset],
  args: { groups: stripVM(ds, portfolioMay), onSelect: fn() },
} satisfies Meta<typeof StatusStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Portfolio: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("button", { name: CHIP })).toHaveLength(13);
    await userEvent.click(canvas.getByRole("button", { name: "Germany, off track" }));
    await expect(args.onSelect).toHaveBeenCalledWith("de");
  },
};

export const Europe: Story = {
  args: { groups: stripVM(ds, { ...portfolioMay, region: "eu" }) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button", { name: CHIP })).toHaveLength(5);
  },
};
