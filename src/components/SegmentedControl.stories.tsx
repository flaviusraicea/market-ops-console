import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { SegmentedControl } from "./SegmentedControl";

type Basis = "month" | "ytd" | "mat";

const OPTIONS = [
  { value: "month", label: "Month" },
  { value: "ytd", label: "YTD" },
  { value: "mat", label: "MAT", disabled: true, hint: "Needs 12 months of history" },
] as const;

function Demo({ initial }: { initial: Basis }) {
  const [value, setValue] = useState<Basis>(initial);
  return (
    <div className="p-4">
      <SegmentedControl<Basis>
        ariaLabel="Basis"
        options={OPTIONS}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: "components/SegmentedControl",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { initial: "month" },
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("radiogroup", { name: "Basis" });
    const month = within(group).getByRole("radio", { name: "Month" });
    await expect(month).toBeChecked();
    month.focus();
    // Arrow keys move to the next enabled option and skip the disabled one when wrapping.
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(group).getByRole("radio", { name: "YTD" })).toBeChecked();
    await userEvent.keyboard("{ArrowRight}");
    await expect(within(group).getByRole("radio", { name: "Month" })).toBeChecked();
  },
};
