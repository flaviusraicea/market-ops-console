import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { withDataset } from "../../../.storybook/decorators";
import type { AskStream } from "@/lib/stream/chatClient";
import { Panel } from "./Panel";

// A stream that never answers, so stories do not touch the network.
const quiet: AskStream = () => new Promise(() => {});

const meta = {
  title: "features/assistant/Panel",
  component: Panel,
  decorators: [withDataset],
  args: { onSubmit: fn(), stream: quiet },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Assistant")).toBeInTheDocument();

    const labels = [
      "Which markets are at risk?",
      "Why did Germany dip?",
      "What will sales be next year?",
    ];
    const chips = within(canvas.getByRole("list", { name: "Suggested questions" })).getAllByRole(
      "button",
    );
    await expect(chips.map((b) => b.textContent)).toEqual(labels);

    const box = canvas.getByRole("textbox", { name: "Ask the assistant" });
    await userEvent.type(box, "{Shift>}{Enter}{/Shift}");
    await expect(args.onSubmit).not.toHaveBeenCalled();

    // Picking a suggestion fills and sends; focus ends in the textarea.
    await userEvent.click(canvas.getByRole("button", { name: "Why did Germany dip?" }));
    await expect(args.onSubmit).toHaveBeenCalledWith("Why did Germany dip?");
    await expect(canvas.getByText("STREAMING…")).toBeInTheDocument();
    await expect(box).toHaveFocus();
  },
};

const tick = () => new Promise((r) => setTimeout(r, 20));

/** Three tokens, then done. Slow enough that the caret is observable. */
const threeTokens: AskStream = async (_q, { onEvent }) => {
  for (const value of ["Three ", "markets  ", "lag."]) {
    await tick();
    onEvent({ type: "token", value });
  }
  await new Promise((r) => setTimeout(r, 300));
  onEvent({ type: "done", kind: "normal", citations: [], confidence: "high" });
};

export const StreamsThreeTokens: Story = {
  args: { stream: threeTokens },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox", { name: "Ask the assistant" }), "Go{Enter}");
    await waitFor(() =>
      expect(canvasElement.querySelector("p.font-display")?.textContent).toBe(
        "Three markets  lag.",
      ),
    );
    await expect(canvasElement.querySelector(".caret")).not.toBeNull();
    await waitFor(() => expect(canvasElement.querySelector(".caret")).toBeNull());
    await expect(canvasElement.querySelector("p.font-display")?.textContent).toBe(
      "Three markets  lag.",
    );
    await expect(canvas.getByRole("img", { name: /^High confidence/ })).toBeInTheDocument();
  },
};

/** Streams until aborted, recording each question it was asked. */
const asked: string[] = [];
const hangUntilAbort: AskStream = (question, { signal, onEvent }) =>
  new Promise((resolve) => {
    asked.push(question);
    onEvent({ type: "token", value: "Partial " });
    signal?.addEventListener("abort", () => {
      onEvent({ type: "aborted" });
      resolve();
    });
  });

export const StopThenRetry: Story = {
  args: { stream: hangUntilAbort },
  play: async ({ canvasElement }) => {
    asked.length = 0;
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox", { name: "Ask the assistant" }), "Why?{Enter}");
    await userEvent.click(await canvas.findByRole("button", { name: "Stop" }));
    await expect(await canvas.findByText("Stopped \u00b7 partial answer")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
    // The old card stays marked partial; a new request carries the same question.
    await waitFor(() => expect(asked).toEqual(["Why?", "Why?"]));
    await expect(canvas.getAllByText("Stopped \u00b7 partial answer")).toHaveLength(1);
    await expect(canvas.getAllByText(/You asked:/)).toHaveLength(2);
  },
};
