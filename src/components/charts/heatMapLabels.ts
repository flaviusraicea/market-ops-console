/** Month label steps, smallest first: every third month, then every sixth, then once a year. */
export const LABEL_STEPS = [3, 6, 12] as const;
/** The least room between two month labels. */
export const LABEL_GAP = 8;

/** Where a label sits in its column: from the column's left edge, or ending at its right edge. */
export type LabelAlign = "start" | "end";

export type LabelLayout = {
  /** Distance from one month column's left edge to the next. */
  pitch: number;
  /** A month column's own width: the pitch less the gap between columns. */
  column: number;
  /** The widest month label. Every label has the same format, so one width stands for all. */
  label: number;
  /** The last month column wholly in view: the latest month unless the grid is scrolled back. */
  last: number;
};

/** The smallest step at which two neighbouring left-aligned labels keep LABEL_GAP between them. */
export function monthLabelStep(pitch: number, labelWidth: number): number {
  return LABEL_STEPS.find((step) => step * pitch - labelWidth >= LABEL_GAP) ?? 12;
}

/**
 * Which month columns carry a label, and how each is aligned. The last month in view is always labelled and ends
 * at its column's right edge, so it never runs past the visible area; the selected month is always labelled too,
 * and wins when the two are too close for both.
 * The rest count back from the last in view at the smallest step that keeps LABEL_GAP between neighbours, and any
 * of them that would come closer than LABEL_GAP to the last or the selected label is left out.
 */
export function monthLabels(
  { pitch, column, label, last }: LabelLayout,
  selected?: number,
): Map<number, LabelAlign> {
  const step = monthLabelStep(pitch, label);
  const span = (i: number, align: LabelAlign): [number, number] =>
    align === "end"
      ? [i * pitch + column - label, i * pitch + column]
      : [i * pitch, i * pitch + label];
  const kept: Array<[number, number]> = [];
  const out = new Map<number, LabelAlign>();
  const place = (i: number, align: LabelAlign) => {
    if (out.has(i)) return;
    const [a, b] = span(i, align);
    if (kept.some(([x, y]) => a < y + LABEL_GAP && b > x - LABEL_GAP)) return;
    kept.push([a, b]);
    out.set(i, align);
  };
  // The selected month goes first: when it sits too close to the last month for both, it is the one the user is
  // looking at, so it keeps its label. Near the end it would run past the last column in view, so it ends at its
  // own column instead.
  if (selected !== undefined && selected >= 0 && selected < last)
    place(selected, selected * pitch + label > last * pitch + column ? "end" : "start");
  place(last, "end");
  for (let i = last - step; i >= 0; i -= step) place(i, "start");
  return out;
}
