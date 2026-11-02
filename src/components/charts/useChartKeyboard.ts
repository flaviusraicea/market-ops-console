"use client";

import { useCallback, useState, type KeyboardEvent } from "react";

type Options = {
  count: number;
  /** Set for grids so Up and Down move by a row. */
  columns?: number;
  onActivate: (index: number) => void;
  /** Called after the active mark changes, so the caller can move DOM focus. */
  onMove?: (index: number) => void;
};

/** Roving focus over a list of marks: one tab stop, arrows move, Enter or Space activates. */
export function useChartKeyboard({ count, columns, onActivate, onMove }: Options) {
  const [activeIndex, setActiveIndex] = useState(0);

  const move = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), count - 1);
      setActiveIndex(clamped);
      onMove?.(clamped);
    },
    [count, onMove],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent, index: number = activeIndex) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          move(index + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          move(index - 1);
          break;
        case "ArrowDown":
          if (columns) {
            e.preventDefault();
            move(index + columns);
          }
          break;
        case "ArrowUp":
          if (columns) {
            e.preventDefault();
            move(index - columns);
          }
          break;
        case "Home":
          e.preventDefault();
          move(0);
          break;
        case "End":
          e.preventDefault();
          move(count - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onActivate(index);
          break;
      }
    },
    [activeIndex, columns, count, move, onActivate],
  );

  return { activeIndex, setActiveIndex, onKeyDown };
}
