// Colour scales for the chart kit (design-system.md section 3). They return token names, never colours,
// so the same mapping serves both themes. Callers wrap the name as `var(${name})`.
import { formatMoneyCompact } from "@/lib/format";

export type DivergingToken =
  "--div-n3" | "--div-n2" | "--div-n1" | "--div-0" | "--div-p1" | "--div-p2" | "--div-p3";
export type SequentialToken =
  "--seq-1" | "--seq-2" | "--seq-3" | "--seq-4" | "--seq-5" | "--seq-6" | "--seq-7";

const DIVERGING: readonly DivergingToken[] = [
  "--div-n3",
  "--div-n2",
  "--div-n1",
  "--div-0",
  "--div-p1",
  "--div-p2",
  "--div-p3",
];
const SEQUENTIAL: readonly SequentialToken[] = [
  "--seq-1",
  "--seq-2",
  "--seq-3",
  "--seq-4",
  "--seq-5",
  "--seq-6",
  "--seq-7",
];

const NEAR_ZERO = 0.05;

/** Attainment around 100: below 92.5, 95, 100, exactly 100 (±0.05), up to 102, 105, above. */
export function attainmentDiverging(value: number): DivergingToken {
  if (Math.abs(value - 100) <= NEAR_ZERO) return "--div-0";
  if (value < 92.5) return "--div-n3";
  if (value < 95) return "--div-n2";
  if (value < 100) return "--div-n1";
  if (value <= 102) return "--div-p1";
  if (value <= 105) return "--div-p2";
  return "--div-p3";
}

/** Seven equal bins of value / max. */
export function revenueSequential(value: number, max: number): SequentialToken {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return SEQUENTIAL[Math.min(6, Math.floor(ratio * 7))] as SequentialToken;
}

/**
 * Year-on-year growth in percent, symmetric around 0 with a neutral band of ±0.05.
 * A negative hue is never used for a value ≥ 0, and a positive hue never for a value ≤ 0.
 */
export function growthDiverging(value: number): DivergingToken {
  if (Math.abs(value) <= NEAR_ZERO) return "--div-0";
  if (value < -5) return "--div-n3";
  if (value < -2) return "--div-n2";
  if (value < 0) return "--div-n1";
  if (value <= 2) return "--div-p1";
  if (value <= 5) return "--div-p2";
  return "--div-p3";
}

export type LegendBin = { label: string; token: DivergingToken | SequentialToken };

const bins = (labels: readonly string[]): LegendBin[] =>
  labels.map((label, i) => ({ label, token: DIVERGING[i] as DivergingToken }));

export const ATTAINMENT_LEGEND: LegendBin[] = bins([
  "<92.5%",
  "92.5–95",
  "95–100",
  "100",
  "100–102",
  "102–105",
  ">105%",
]);

export const GROWTH_LEGEND: LegendBin[] = bins(["<−5%", "−5 to −2", "−2 to 0", "0", "0 to 2", "2 to 5", ">5%"]);

export function revenueLegend(max: number): LegendBin[] {
  return SEQUENTIAL.map((token, i) => ({
    token,
    label:
      i === 0
        ? `<${formatMoneyCompact(max / 7)}`
        : i === 6
          ? `>${formatMoneyCompact((max * 6) / 7)}`
          : formatMoneyCompact((max * i) / 7),
  }));
}

export function colourFor(
  metric: "attainment" | "revenue" | "growth",
  value: number,
  max: number,
): DivergingToken | SequentialToken {
  if (metric === "attainment") return attainmentDiverging(value);
  if (metric === "growth") return growthDiverging(value);
  return revenueSequential(value, max);
}
