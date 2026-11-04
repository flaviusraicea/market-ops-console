import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ViewAsTable } from "./ViewAsTable";

const meta = {
  title: "components/charts/ViewAsTable",
  component: ViewAsTable,
  decorators: [
    (Story) => (
      <div className="max-w-[480px] p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    subject: "revenue by market",
    toolbar: <span className="text-[length:var(--text-label)] text-ink-2">Revenue by market</span>,
    chart: (
      <p role="img" aria-label="Chart placeholder">
        Chart
      </p>
    ),
    table: (
      <Table>
        <TableCaption className="sr-only">Revenue by market</TableCaption>
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
        </TableBody>
      </Table>
    ),
  },
} satisfies Meta<typeof ViewAsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // The visible label leads the name (WCAG 2.5.3); the subject tells toggles apart (2.4.6).
    const toggle = c.getByRole("button", { name: "View as table of revenue by market" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    await expect(
      c.getByRole("button", { name: /^View as chart of revenue by market/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(c.getByRole("table")).toBeVisible();
  },
};

export const TableOnly: Story = {
  args: { forced: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button", { name: /View as/ })).toBeNull();
    await expect(c.getByRole("table")).toBeVisible();
  },
};
