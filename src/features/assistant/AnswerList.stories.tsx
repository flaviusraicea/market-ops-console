import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";

import { portfolioMay, withDataset } from "../../../.storybook/decorators";
import data from "@/data/data.json";
import { parseDataset } from "@/domain";
import { panelContextVM } from "@/features/overview/viewModel";
import { AnswerList } from "./AnswerList";
import type { Answer } from "./useAnswerMachine";

const text =
  "Germany's revenue fell in early 2026, with the steepest drop in March. The decline runs across the product portfolio there, and actuals came in well under forecast.";
const done = (n: number): Answer => ({
  id: `a${n}`,
  question: `Question ${n}`,
  status: "done",
  text,
  kind: "normal",
  confidence: "high",
  citations: [],
});
const stopped = (n: number): Answer => ({
  id: `a${n}`,
  question: `Question ${n}`,
  status: "stopped",
  text: text.slice(0, 80),
});
const context = panelContextVM(parseDataset(data), portfolioMay);
const three: Answer[] = [done(1), stopped(2), done(3)];

function Harness() {
  const [answers, setAnswers] = useState<Answer[]>(three);
  return (
    <div>
      <button type="button" onClick={() => setAnswers((a) => [...a, done(a.length + 1)])}>
        Append answer
      </button>
      <div className="flex h-[320px] flex-col p-4">
        <AnswerList
          answers={answers}
          context={context}
          onPick={fn()}
          onStop={fn()}
          onRetry={fn()}
          onTry={fn()}
        />
      </div>
    </div>
  );
}

const meta = {
  title: "features/assistant/AnswerList",
  component: AnswerList,
  decorators: [withDataset],
} satisfies Meta<typeof AnswerList>;

export default meta;
type Story = StoryObj<typeof meta>;

const inView = (el: HTMLElement, box: HTMLElement) => {
  const a = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  return a.bottom <= b.bottom + 1 && a.top >= b.top - 1;
};

export const ThreeAnswers: Story = {
  args: { answers: three, context, onPick: fn(), onStop: fn(), onRetry: fn(), onTry: fn() },
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("region", { name: "Conversation" });
    await waitFor(() => expect(inView(canvas.getByText("Question 3"), region)).toBe(true));
    await expect(inView(canvas.getByText("Question 1"), region)).toBe(false);

    region.scrollTop = 0;
    await waitFor(() => expect(inView(canvas.getByText("Question 1"), region)).toBe(true));
    // IntersectionObserver reports the scroll on the next rendering update; real readers never scroll and
    // receive text in the same frame.
    await new Promise((r) => setTimeout(r, 200));
    await userEvent.click(canvas.getByRole("button", { name: "Append answer" }));
    const next = await canvas.findByRole("button", { name: "Scroll to newest answer" });
    await userEvent.click(next);
    await waitFor(() => expect(inView(canvas.getByText("Question 4"), region)).toBe(true));
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: "Scroll to newest answer" })).toBeNull(),
    );
  },
};
