"use client";

import { Badge } from "@/components/ui/badge";
import { StatusGlyph } from "@/components/StatusGlyph";
import type { RegionId } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { CardHeader } from "@/components/CardHeader";
import { cn } from "@/components/cn";
import type { RegionBarsVM } from "./viewModel";

/** The bar track spans 90% to 110% attainment, with the 100% mark at the centre. */
const SPAN = 10;

function Bar({ attainmentPct, label }: { attainmentPct: number; label: string }) {
  const delta = Math.max(-SPAN, Math.min(SPAN, attainmentPct - 100));
  const width = (Math.abs(delta) / (SPAN * 2)) * 100;
  const below = delta < 0;
  return (
    <div
      role="img"
      aria-label={label}
      className="relative h-2 w-full min-w-[72px] rounded-pill bg-surface-2"
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0", below ? "bg-bad-mark" : "bg-accent")}
        style={{ width: `${width}%`, [below ? "right" : "left"]: "50%" }}
      />
      <span aria-hidden className="absolute inset-y-[-2px] left-1/2 w-px bg-ink-2" />
    </div>
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
  const { setContext } = useConsoleContext();
  const select = onSelect ?? ((region: string) => setContext({ region: region as RegionId }));
  return (
    <section
      aria-labelledby="regions-h"
      className={cn(
        "flex h-full flex-col gap-3",
        framed
          ? "rounded-card border border-border bg-surface p-[var(--pad-card)]"
          : "px-[var(--pad-card)] py-3",
      )}
    >
      <CardHeader
        title="By region"
        titleId="regions-h"
        subtitle="Attainment vs forecast · 100% at centre"
      />
      <ul>
        {bars.rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(72px,96px)_auto] items-center gap-3 border-t border-grid py-2 first:border-t-0"
          >
            <div className="min-w-0">
              <button
                type="button"
                aria-label={`Drill into ${row.name}`}
                onClick={() => select(row.id)}
                className="rounded-control text-left font-medium text-ink hover:underline"
              >
                {row.name}
              </button>
              <p className="num text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
                {row.revenue}
              </p>
            </div>
            <Bar
              attainmentPct={row.attainmentPct}
              label={`${row.name}, ${row.attainment} of forecast`}
            />
            <div className="flex flex-col items-end gap-1">
              <p className="num font-medium text-ink">{row.attainment}</p>
              <Badge variant={row.status}>
                <StatusGlyph status={row.status} />
                {row.statusLabel}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-border pt-3 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
        <strong className="font-semibold text-ink">{bars.sentence.lead}</strong>
        {bars.sentence.rest}
      </p>
      <p className="mt-auto text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        {bars.caption}
      </p>
    </section>
  );
}
