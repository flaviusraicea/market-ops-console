import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./table";

const meta = {
  title: "components/ui/Table",
  component: Table,
  decorators: [
    (Story) => (
      <div className="max-w-[520px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    children: (
      <>
        <TableCaption className="sr-only">Revenue by market, May 2026</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Market</TableHead>
            <TableHead scope="col">Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="text-left">Germany</TableCell>
            <TableCell>$3.2M</TableCell>
          </TableRow>
          <TableRow data-state="selected">
            <TableCell className="text-left">Spain</TableCell>
            <TableCell>$2.1M</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-left">Portfolio</TableCell>
            <TableCell>$5.3M</TableCell>
          </TableRow>
        </TableFooter>
      </>
    ),
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("table", { name: "Revenue by market, May 2026" })).toBeVisible();
  },
};
