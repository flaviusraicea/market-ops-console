import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import data from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { CitationSchema, parseDataset } from "@/domain";
import { AnswerCard } from "./AnswerCard";
import type { Answer } from "./useAnswerMachine";
import { answerReducer } from "./useAnswerMachine";

const ds = parseDataset(data);
const dip = fixtures.fixtures.find((f) => f.id === "germany-dip")!;
const question = "Why did Germany dip?";
const base = { id: "a1", question } as const;

const streaming: Answer = {
  ...base,
  status: "streaming",
  text: dip.answer.text.slice(0, 110),
  controller: new AbortController(),
};
const stopped: Answer = { ...base, status: "stopped", text: dip.answer.text.slice(0, 110) };
const done = answerReducer(
  { ...streaming, text: dip.answer.text },
  {
    type: "DONE",
    kind: "normal",
    confidence: "high",
    citations: dip.answer.citations.map((c) => CitationSchema.parse(c)),
    ds,
  },
) as Answer;

const meta = {
  title: "features/assistant/AnswerCard",
  component: AnswerCard,
  args: { onStop: fn(), onRetry: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[380px] p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AnswerCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Streaming: Story = {
  args: { answer: streaming },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(question)).toBeInTheDocument();
    await expect(canvas.getByText("STREAMING…")).toBeInTheDocument();
    await expect(canvasElement.querySelector(".caret")).not.toBeNull();
    await expect(canvas.queryByText("Show sources")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Stop" }));
    await expect(args.onStop).toHaveBeenCalledOnce();
  },
};

export const StreamingReducedMotion: Story = {
  args: { answer: streaming },
  globals: { reducedMotion: "on" },
  play: async ({ canvasElement }) => {
    const caret = canvasElement.querySelector(".caret");
    await expect(caret).not.toBeNull();
    await expect(getComputedStyle(caret!).animationName).toBe("none");
  },
};

export const Done: Story = {
  args: { answer: done },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(dip.answer.text)).toBeInTheDocument();
    await expect(canvasElement.querySelector(".caret")).toBeNull();
    const labels = within(canvas.getByRole("list", { name: "Citations" }))
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    await expect(labels).toEqual([
      "Germany, Feb 2026",
      "Germany, Mar 2026 (largest dip)",
      "Veltrix in Germany, Mar 2026",
    ]);
    await expect(
      canvas.getByRole("img", { name: "High confidence: directly supported by cited data" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Show sources" })).toBeDisabled();
  },
};

export const Stopped: Story = {
  args: { answer: stopped },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Stopped · partial answer")).toBeInTheDocument();
    await expect(canvas.getByText("PARTIAL · NO SOURCES ATTACHED")).toBeInTheDocument();
    await expect(canvasElement.querySelector(".caret")).toBeNull();
    await expect(canvas.queryByRole("list", { name: "Citations" })).toBeNull();
    await expect(canvas.queryByRole("img")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    await expect(args.onRetry).toHaveBeenCalledOnce();
  },
};

export const Failed: Story = {
  args: { answer: { ...base, status: "failed", text: "", message: "boom" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Request failed")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  },
};
