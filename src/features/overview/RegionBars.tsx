"use client";

import { StatusBadge } from "@/components/StatusBadge";
import type { RegionId } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { CardCaption, CardHeader } from "@/components/CardHeader";
import { cn } from "@/components/cn";
import type { RegionBarVM, RegionBarsVM } from "./viewModel";

/** The bar takes its badge's status colour, so a region reads as one status everywhere. */
const BAR_FILL: Record<RegionBarVM["status"], string> = {
  on_track: "bg-ok-mark",
  at_risk: "bg-warn-mark",
  off_track: "bg-bad-mark",
};

/** Decoration inside the row button: the attainment figure beside it is the text a screen reader hears. */
function Bar({
  share,
  tickPct,
  status,
}: {
  share: number;
  tickPct: number;
  status: RegionBarVM["status"];
}) {
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
        style={{ left: `${tickPct}%` }}
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
      {/* Each row is one button, so the whole row tints on hover, like a table row. Its name is its visible text with hidden
          separators: "Drill into Europe, $7.06M, At risk, 95.4%". Fixed badge and value columns keep every track,
          and so every 100 % tick, at one x. */}
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
                  "press grid w-full items-center gap-3 px-2 py-2 text-left",
                  // The selected row looks like a selected table row; the others only tint on hover.
                  current
                    ? "selected-row"
                    : "transition-colors duration-[var(--dur-fast)] hover:bg-surface-2",
                  // A phone keeps its row as it was. From md the list's own width picks the layout: under 24 rem
                  // (the panel docked) two lines per row; wider, one line with the bar taking 3 parts to the name's 2.
                  "grid-cols-[minmax(0,1fr)_auto_minmax(48px,72px)_auto]",
                  "md:@min-[24rem]:grid-cols-[minmax(120px,2fr)_104px_minmax(48px,3fr)_4rem]",
                  "md:@max-[24rem]:grid-cols-[88px_minmax(0,1fr)_3.5rem] md:@max-[24rem]:gap-x-2 md:@max-[24rem]:gap-y-1.5",
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
                  <Bar share={row.share} tickPct={bars.tickPct} status={row.status} />
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
