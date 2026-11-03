import { formatMoneyCompact, formatMonthShort, formatPct, formatPeriodAbbr } from "@/lib/format";
import type { TooltipContent } from "./ChartTooltip";
import type { HeatCell } from "./HeatMap";

/** What a heat map cell's tooltip says: the figures, the change on the prior month and, with `ask`, the action. */
export function heatCellTooltip(
  name: string,
  cell: HeatCell,
  prev: HeatCell | undefined,
  ask: (() => void) | undefined,
): TooltipContent {
  const change = cell.momPct === undefined ? "" : formatPct(cell.momPct, { sign: true });
  return {
    title: `${name} · ${formatPeriodAbbr(cell.period)}`,
    rows: [
      { label: "Actual", value: formatMoneyCompact(cell.actual) },
      { label: "Forecast", value: formatMoneyCompact(cell.forecast) },
      { label: "Attainment", value: formatPct(cell.value, { sign: false }) },
      ...(prev ? [{ label: `vs ${formatMonthShort(prev.period)}`, value: change }] : []),
    ],
    ...(ask
      ? {
          action: {
            label: `Ask about ${name}, ${formatPeriodAbbr(cell.period)}`,
            hint: "⇧↩",
            onActivate: ask,
          },
        }
      : {}),
  };
}
