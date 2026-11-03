import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useChartKeyboard } from "@/components/charts/useChartKeyboard";

describe("useChartKeyboard", () => {
  it("keeps a tab stop when the data shrinks under the remembered index", () => {
    const { result, rerender } = renderHook(
      ({ count }) => useChartKeyboard({ count, onActivate: () => {} }),
      { initialProps: { count: 25 } },
    );
    act(() => result.current.setActiveIndex(24));
    expect(result.current.activeIndex).toBe(24);
    rerender({ count: 10 });
    expect(result.current.activeIndex).toBe(9);
  });
});
