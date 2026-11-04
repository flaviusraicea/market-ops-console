import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AnswerList, MAX_VISIBLE_ANSWERS } from "@/features/assistant/AnswerList";
import type { Answer } from "@/features/assistant/useAnswerMachine";

vi.mock("@/features/assistant/AnswerCardLazy", () => ({
  AnswerCard: ({ answer }: { answer: Answer }) => <p>{answer.question}</p>,
}));

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const answers = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    question: `Question ${i}`,
    status: "done",
    text: "",
  })) as unknown as Answer[];

const props = {
  context: { about: null, whatChanged: "" },
  onPick: vi.fn(),
  onStop: vi.fn(),
  onRetry: vi.fn(),
  onTry: vi.fn(),
};

describe("AnswerList long sessions", () => {
  it("renders the newest cards and folds the rest under Earlier", () => {
    render(<AnswerList answers={answers(MAX_VISIBLE_ANSWERS + 3)} {...props} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(MAX_VISIBLE_ANSWERS);
    expect(screen.queryByText("Question 0")).toBeNull();
    expect(screen.getByText(`Question ${MAX_VISIBLE_ANSWERS + 2}`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Earlier · 3 answers" })).toBeTruthy();
  });

  it("opens the fold, shows every card and keeps focus on the page's content", async () => {
    render(<AnswerList answers={answers(MAX_VISIBLE_ANSWERS + 3)} {...props} />);
    await userEvent.click(screen.getByRole("button", { name: /^Earlier/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(MAX_VISIBLE_ANSWERS + 3);
    expect(screen.queryByRole("button", { name: /^Earlier/ })).toBeNull();
    await vi.waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.activeElement?.textContent).toBe("Question 0");
  });
});
