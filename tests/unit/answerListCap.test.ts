import { describe, expect, it } from "vitest";

import { MAX_VISIBLE_ANSWERS, visibleAnswers } from "@/features/assistant/AnswerList";

const cards = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("visibleAnswers", () => {
  it("shows every card up to the cap", () => {
    expect(visibleAnswers(cards(MAX_VISIBLE_ANSWERS), false)).toEqual({
      shown: cards(MAX_VISIBLE_ANSWERS),
      folded: 0,
    });
  });

  it("folds the oldest cards beyond the cap and keeps the newest in order", () => {
    const { shown, folded } = visibleAnswers(cards(MAX_VISIBLE_ANSWERS + 7), false);
    expect(folded).toBe(7);
    expect(shown).toHaveLength(MAX_VISIBLE_ANSWERS);
    expect(shown[0]).toBe(7);
    expect(shown.at(-1)).toBe(MAX_VISIBLE_ANSWERS + 6);
  });

  it("shows everything once Earlier is opened", () => {
    expect(visibleAnswers(cards(80), true)).toEqual({ shown: cards(80), folded: 0 });
  });
});
