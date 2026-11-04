"use client";

import { StatusBadge } from "@/components/StatusBadge";
import type { RegionId } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { CardCaption, CardHeader } from "@/components/CardHeader";
import { cn } from "@/components/cn";
import type { RegionBarVM, RegionBarsVM } from "./viewModel";

/**
 * One scale for every row, so bar lengths compare across regions: 0 to 120 %, or further when a region is
 * above that, rounded up to the next 10 (Fable's By-region ruling).
 */
export function regionScaleMax(attainments: readonly number[]): number {
  return Math.max(120, Math.ceil(Math.max(0, ...attainments) / 10) * 10);
}

/** The bar takes its badge's status colour, so a region reads as one status everywhere. */
const BAR_FILL: Record<RegionBarVM["status"], string> = {
  on_track: "bg-ok-mark",
  at_risk: "bg-warn-mark",
  off_track: "bg-bad-mark",
};

/** Decoration inside the row button: the attainment figure beside it is the text a screen reader hears. */
function Bar({
  attainmentPct,
  max,
  status,
}: {
  attainmentPct: number;
  max: number;
  status: RegionBarVM["status"];
}) {
  const share = Math.min(Math.max(attainmentPct, 0), max) / max;
  return (
    <span aria-hidden className="relative block h-2 w-full min-w-12 bg-surface-2 md:min-w-[72px]">
      <span
        aria-hidden
        // The full track, scaled from the left: a Live tick animates transform, never width, so nothing reflows.
        className={cn(
          "absolute inset-0 origin-left transition-transform duration-[var(--dur-chart)] ease-[var(--ease-out)]",
          BAR_FILL[status],
        )}
        style={{ transform: `scaleX(${share})` }}
      />
      {/* The 100 % tick, at the same x in every row. */}
      <span
        aria-hidden
        className="absolute inset-y-[-2px] w-px bg-ink-muted"
        style={{ left: `${(100 / max) * 100}%` }}
      />
    </span>
  );
}

/** Attainment per region as bullet bars around 100%, plus one derived sentence about the weakest region. */
export function RegionBars({
  bars,
  framed = true,
  onSelect,
}: {
  bars: RegionBarsVM;
  /** The Analyst sheet draws its own dividers, so it asks for the bars without the card. */
  framed?: boolean;
  onSelect?: (regionId: string) => void;
}) {
  const { ctx, setContext } = useConsoleContext();
  const max = regionScaleMax(bars.rows.map((r) => r.attainmentPct));
  const select =
    onSelect ??
    ((region: string) =>
      setContext({ region: region as RegionId, market: undefined, product: undefined }));
  return (
    <section
      aria-labelledby="regions-h"
      className={cn(
        "flex h-full flex-col gap-3",
        framed ? "rounded-sheet layer-card p-[var(--pad-card)]" : "px-[var(--pad-card)] py-3",
      )}
    >
      <CardHeader title="By region" titleId="regions-h" subtitle={bars.subtitle} />
      {/* Each row is one button: the whole row is the link, so it takes the lift hover. Its name is its visible
          text, with hidden separators: "Drill into Europe, $7.06M, At risk, 95.4%". From md, a list 24 rem or wider has a fixed 104 px badge column and a 4 rem value column; a narrower one (1280 px and below with the panel docked) takes two lines per row, name and value, then an 88 px badge slot and the bar. Either way
          every track starts and ends at the same x and the 100 % ticks line up. */}
      <ul className="@container -mx-2 flex flex-col">
        {bars.rows.map((row) => {
          const current = ctx.region === row.id;
          return (
            <li key={row.id} className="border-t border-grid first:border-t-0">
              <button
                type="button"
                onClick={() => select(row.id)}
                {...(current ? { "aria-current": "true" as const } : {})}
                className={cn(
                  "lift press grid w-full items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-2",
                  // A phone keeps its row as it was; from md the list's own width picks the layout (Fable).
                  "grid-cols-[minmax(0,1fr)_auto_minmax(48px,72px)_auto]",
                  "md:@min-[24rem]:grid-cols-[minmax(0,3fr)_104px_minmax(48px,2fr)_4rem]",
                  "md:@max-[24rem]:grid-cols-[88px_minmax(0,1fr)_3.5rem] md:@max-[24rem]:gap-x-2 md:@max-[24rem]:gap-y-1.5",
                  current && "bg-surface-2",
                )}
              >
                <span className="min-w-0 md:@max-[24rem]:col-span-2">
                  <span
                    className={cn(
                      "block truncate text-ink",
                      current ? "font-semibold" : "font-medium",
                    )}
                  >
                    <span className="sr-only">Drill into </span>
                    {row.name}
                    <span className="sr-only">, </span>
                  </span>
                  <span className="num block text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
                    {row.revenue}
                    <span className="sr-only">, </span>
                  </span>
                </span>
                <span className="md:@max-[24rem]:row-start-2">
                  <StatusBadge status={row.status} label={row.statusLabel} size="sm" />
                </span>
                <span className="md:@max-[24rem]:col-span-2 md:@max-[24rem]:row-start-2">
                  <Bar attainmentPct={row.attainmentPct} max={max} status={row.status} />
                </span>
                <span className="num text-right font-medium text-ink md:@max-[24rem]:col-start-3 md:@max-[24rem]:row-start-1">
                  <span className="sr-only">, </span>
                  {row.attainment}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border pt-3 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
        <strong className="font-semibold text-ink">{bars.sentence.lead}</strong>
        {bars.sentence.rest}
      </p>
      <CardCaption>{bars.caption}</CardCaption>
    </section>
  );
}
