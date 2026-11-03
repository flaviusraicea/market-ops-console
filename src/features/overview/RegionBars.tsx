"use client";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { RegionBarsVM } from "./viewModel";

// The track spans 90 % to 110 % attainment with the 100 % mark at its centre.
const LO = 90;
const HI = 110;
const pos = (v: number) => Math.min(100, Math.max(0, ((v - LO) / (HI - LO)) * 100));

/**
 * Attainment by region as bullet bars. The fill runs from the 100 % mark to the value: the accent when on
 * or above plan, the bad mark when below. The region name drills into the region.
 */
export function RegionBars({ vm, className }: { vm: RegionBarsVM; className?: string }) {
  const { ctx, setContext } = useConsoleContext();
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <Eyebrow as="h4" className="text-ink">
          By region
        </Eyebrow>
        <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          Attainment vs forecast · 100% at centre
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {vm.rows.map((r) => {
          const below = r.attainmentValue < 100;
          const from = Math.min(pos(100), pos(r.attainmentValue));
          const to = Math.max(pos(100), pos(r.attainmentValue));
          return (
            <li
              key={r.id}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-center gap-x-3 py-1.5"
            >
              <div className="flex min-w-0 flex-col">
                {ctx.region === r.id ? (
                  <span className="truncate font-medium text-ink">{r.name}</span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Drill into ${r.name}`}
                    onClick={() => setContext({ region: r.id })}
                    className="w-fit max-w-full truncate rounded-control text-left font-medium text-ink underline-offset-4 hover:underline"
                  >
                    {r.name}
                  </button>
                )}
                <span className="num text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
                  {r.revenue}
                </span>
              </div>
              <div
                role="img"
                aria-label={`${r.name}, ${r.attainment} of forecast`}
                className="relative h-2 rounded-pill bg-surface-2"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 rounded-pill",
                    below ? "bg-bad-mark" : "bg-accent",
                  )}
                  style={{ left: `${from}%`, width: `${to - from}%` }}
                />
                <span
                  aria-hidden
                  className="absolute -inset-y-0.5 w-px bg-ink-2"
                  style={{ left: `${pos(100)}%` }}
                />
              </div>
              <span className="num text-right font-medium text-ink">{r.attainment}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
        <b className="font-semibold text-ink">{vm.sentence.region}</b>
        {vm.sentence.after}
      </p>
      <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        {vm.caption}
      </p>
    </div>
  );
}
