import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { PeriodSchema } from "@/domain";
import type { AskContext } from "@/features/assistant/askWhy";
import { useAnswerMachine } from "@/features/assistant/useAnswerMachine";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset } from "@/lib/context/invariants";
import type { AskStream, AskStreamOptions } from "@/lib/stream/chatClient";
import { ds } from "./helpers";

const wrapper = ({ children }: { children: ReactNode }) => (
  <DatasetProvider dataset={lightDataset(ds)}>{children}</DatasetProvider>
);

const germany: AskContext = {
  entity: { kind: "market", marketId: "de" },
  period: PeriodSchema.parse("2026-03"),
  label: "Germany · Mar 2026",
};

/** A stream that records what each request carried and then ends. */
function recordingStream() {
  const sent: Array<{ question: string; context: AskStreamOptions["context"] }> = [];
  const stream: AskStream = (question, { context, onEvent }) => {
    sent.push({ question, context });
    onEvent({ type: "done", kind: "normal", citations: [], confidence: "high" });
    return Promise.resolve();
  };
  return { sent, stream };
}

describe("the view a question is about travels with it", () => {
  it("sends the entity and month the question was asked from", async () => {
    const { sent, stream } = recordingStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    await act(async () => result.current.ask("Why did revenue dip?", germany));
    expect(sent).toEqual([
      {
        question: "Why did revenue dip?",
        context: { entity: germany.entity, period: germany.period },
      },
    ]);
  });

  it("sends no view for a question asked without one", async () => {
    const { sent, stream } = recordingStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    await act(async () => result.current.ask("q"));
    expect(sent[0]?.context).toBeUndefined();
  });

  it("asks a retry about the same view", async () => {
    const { sent, stream } = recordingStream();
    const { result } = renderHook(() => useAnswerMachine(stream), { wrapper });
    await act(async () => result.current.ask("Why did revenue dip?", germany));
    const first = result.current.answers[0]?.id ?? "";
    await act(async () => result.current.retry(first));
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual(sent[0]);
  });
});
