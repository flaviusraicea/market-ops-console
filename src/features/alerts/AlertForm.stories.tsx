import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import type { AlertRule } from "@/domain";
import { AlertForm, type AlertFormProps } from "./AlertForm";
import { RuleList } from "./RuleList";
import type { RuleRow } from "./useAlertSave";

const meta = {
  title: "features/alerts/AlertForm",
  component: AlertForm,
  decorators: [withDataset],
  args: { saveRule: fn(), onRetry: fn(), onDismiss: fn() },
} satisfies Meta<typeof AlertForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: withList([]),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Growth below")).toHaveValue("0");
    await expect(canvas.getByLabelText("Attainment below")).toHaveValue("95");
    await expect(canvas.getByRole("combobox", { name: "Scope" })).toHaveTextContent("All markets");
    await expect(canvas.getByRole("button", { name: "Save thresholds" })).toBeEnabled();
    await expect(
      canvas.getByText("No alert rules yet. Add one to watch a threshold."),
    ).toBeInTheDocument();
  },
};

export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Attainment below");
    await userEvent.clear(input);
    await userEvent.type(input, "120");

    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    const message = canvas.getByText("Enter a value between 0 and 100.");
    await expect(input.getAttribute("aria-describedby")).toContain(message.parentElement?.id ?? "");
    await expect(canvas.getByRole("button", { name: "Save thresholds" })).toBeDisabled();
  },
};

export const Valid: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: "Scope" }));
    await userEvent.click(await within(document.body).findByRole("option", { name: "Europe" }));

    const save = canvas.getByRole("button", { name: "Save thresholds" });
    await expect(save).toBeEnabled();
    await userEvent.click(save);

    await expect(args.saveRule).toHaveBeenCalledTimes(1);
    const [rules, opts] = (args.saveRule as ReturnType<typeof fn>).mock.calls[0] as [
      AlertRule[],
      { fail: boolean },
    ];
    await expect(rules).toContainEqual({
      metric: "attainment",
      comparator: "below",
      threshold: 95,
      scope: { regionId: "eu" },
    });
    await expect(opts).toEqual({ fail: false });
  },
};

const rows: RuleRow[] = [
  {
    id: "1",
    metric: "growth",
    comparator: "below",
    threshold: 0,
    scope: { regionId: "eu" },
  },
  {
    id: "2",
    metric: "attainment",
    comparator: "below",
    threshold: 95,
    scope: { regionId: "eu" },
  },
];

function WithList({ list, ...args }: AlertFormProps & { list: RuleRow[] }) {
  return (
    <div className="flex max-w-3xl flex-col gap-4 p-4">
      <AlertForm {...args} />
      <RuleList rules={list} onDelete={fn()} />
    </div>
  );
}

function withList(list: RuleRow[]): NonNullable<Story["render"]> {
  return function Render(args) {
    return <WithList {...args} list={list} />;
  };
}

export const Saving: Story = {
  args: { status: "saving" },
  render: withList(rows.map((r) => ({ ...r, pending: true }))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Save thresholds" })).toBeDisabled();
    await expect(canvas.getAllByText("Saving…").length).toBeGreaterThan(1);
  },
};

export const Saved: Story = {
  args: { status: "saved", savedAt: Date.now() },
  render: withList(rows),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saved · just now")).toBeInTheDocument();
    await expect(
      canvas.getByText("3 markets breach this rule: Germany, Italy, United Kingdom"),
    ).toBeInTheDocument();
  },
};

export const Failed: Story = {
  args: {
    failure: {
      vars: { rules: [], fail: true },
      restored: { growth: 0, attainment: 95 },
      readOnly: false,
    },
  },
  render: withList(rows),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const notice = canvas.getByRole("alert");
    await expect(within(notice).getByText("Couldn't save")).toBeInTheDocument();
    await expect(notice).toHaveTextContent(
      "Your thresholds were restored to the last saved values (growth below 0%, attainment below 95%).",
    );
    await userEvent.click(within(notice).getByRole("button", { name: "Try again" }));
    await expect(args.onRetry).toHaveBeenCalled();
  },
};

export const RefusedForRole: Story = {
  args: {
    onSwitchToAnalyst: fn(),
    failure: {
      vars: { rules: [], fail: false },
      restored: { growth: 0, attainment: 95 },
      readOnly: true,
    },
  },
  render: withList(rows),
  play: async ({ canvasElement, args }) => {
    const notice = within(canvasElement).getByRole("alert");
    await expect(notice).toHaveTextContent("Rules are read-only for Executives.");
    // Trying again could never succeed, so it is not offered.
    await expect(within(notice).queryByRole("button", { name: "Try again" })).toBeNull();
    await userEvent.click(within(notice).getByRole("button", { name: "Switch to Analyst" }));
    await expect(args.onSwitchToAnalyst).toHaveBeenCalled();
  },
};
