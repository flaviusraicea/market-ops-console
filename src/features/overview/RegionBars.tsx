"use client";

import { useId } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import type { RegionId } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { CardCaption, CardHeader } from "@/components/CardHeader";
import { cn } from "@/components/cn";
import type { RegionBarVM, RegionBarsVM } from "./viewModel";

/** The bar track spans 90% to 110% attainment, with the 100% mark at the centre. */
const SPAN = 10;

/** The bar takes its badge's status colour, so a region reads as one status everywhere. */
const BAR_FILL: Record<RegionBarVM["status"], string> = {
  on_track: "bg-ok-mark",
  at_risk: "bg-warn-mark",
  off_track: "bg-bad-mark",
};

/** Decoration inside the row button: the attainment figure beside it is the text a screen reader hears. */
function Bar({ attainmentPct, status }: { attainmentPct: number; status: RegionBarVM["status"] }) {
  const delta = Math.max(-SPAN, Math.min(SPAN, attainmentPct - 100));
  const width = (Math.abs(delta) / (SPAN * 2)) * 100;
  const below = delta < 0;
  return (
    <span aria-hidden className="relative block h-2 w-full min-w-[72px] bg-surface-2">
      <span
        aria-hidden
        className={cn("absolute inset-y-0", BAR_FILL[status])}
        style={{ width: `${width}%`, [below ? "right" : "left"]: "50%" }}
      />
      <span aria-hidden className="absolute inset-y-[-2px] left-1/2 w-px bg-ink-2" />
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
  const descId = useId();
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
      {/* Each row is one button: the whole row is the link, so it takes the lift hover. The badge column is a
          fixed 104 px whatever the word, so every track starts at the same x. */}
      <ul className="-mx-2 flex flex-col">
        {bars.rows.map((row) => {
          const current = ctx.region === row.id;
          return (
            <li key={row.id} className="border-t border-grid first:border-t-0">
              <button
                type="button"
                aria-label={`Drill into ${row.name}`}
                aria-describedby={`${descId}-${row.id}`}
                onClick={() => select(row.id)}
                {...(current ? { "aria-current": "true" as const } : {})}
                className={cn(
                  "lift press grid w-full grid-cols-[minmax(120px,1fr)_104px_minmax(72px,1fr)_auto] items-center gap-3 rounded-control px-2 py-2 text-left hover:bg-surface-2",
                  current && "bg-surface-2",
                )}
              >
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate text-ink",
                      current ? "font-semibold" : "font-medium",
                    )}
                  >
                    {row.name}
                  </span>
                  <span className="num block text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
                    {row.revenue}
                  </span>
                </span>
                <StatusBadge status={row.status} label={row.statusLabel} size="sm" />
                <Bar attainmentPct={row.attainmentPct} status={row.status} />
                <span id={`${descId}-${row.id}`} className="sr-only">
                  {`${row.revenue}, ${row.attainment} of forecast, ${row.statusLabel}`}
                </span>
                <span aria-hidden className="num text-right font-medium text-ink">
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
