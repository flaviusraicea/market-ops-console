import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ProductSelect } from "./ProductSelect";

const meta = {
  title: "features/shell/ProductSelect",
  component: ProductSelect,
  decorators: [
    (Story) => (
      <div className="w-[240px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    product: undefined,
    products: [
      { id: "veltrix", name: "Veltrix" },
      { id: "nuvora", name: "Nuvora" },
    ],
    onChange: fn(),
  },
} satisfies Meta<typeof ProductSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllProducts: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole("combobox", { name: "Product" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Nuvora" }));
    await expect(args.onChange).toHaveBeenCalledWith("nuvora");
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("combobox", { name: "Product" })).toBeDisabled();
  },
};
