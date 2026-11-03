"use client";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { StatusGlyph } from "@/components/StatusGlyph";
import type { RegionId } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { StripGroupVM } from "./viewModel";

/**
 * Every market in scope as a chip, grouped by region. Flagged markets are tinted; the glyph shape and the
 * accessible name carry the status as well. A chip drills into its market. Pass `onSelect` to override that.
 */
export function StatusStrip({
  groups,
  onSelect,
  onSelectRegion,
}: {
  groups: StripGroupVM[];
  onSelect?: (marketId: string) => void;
  onSelectRegion?: (regionId: string) => void;
}) {
  const { ctx, setContext } = useConsoleContext();
  const select = onSelect ?? ((market: string) => setContext({ market }));
  const selectRegion =
    onSelectRegion ?? ((region: string) => setContext({ region: region as RegionId }));

  return (
    <div
      aria-label="Market status by region"
      role="group"
      className="relative flex flex-wrap gap-x-5 gap-y-4 max-md:snap-x max-md:snap-mandatory max-md:flex-nowrap max-md:overflow-x-auto max-md:pr-6 max-md:pb-1 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]"
    >
      {groups.map((group) => {
        const heading = (
          <>
            {group.name} · {group.count}
            <StatusGlyph status={group.status} className="ml-1.5 inline-block" />
          </>
        );
        return (
          <div
            key={group.id}
            role="group"
            aria-label={`${group.name}, ${group.statusLabel.toLowerCase()}, ${group.count} markets`}
            className="flex flex-col gap-2 max-md:shrink-0 max-md:snap-start"
          >
            {ctx.region === group.id ? (
              <Eyebrow>{heading}</Eyebrow>
            ) : (
              <button
                type="button"
                onClick={() => selectRegion(group.id)}
                className="w-fit rounded-control text-left hover:underline"
              >
                <span className="sr-only">Drill into </span>
                <Eyebrow>{heading}</Eyebrow>
              </button>
            )}
            <ul
              // Pairs stack; larger groups run three across.
              className={cn(
                "grid gap-1.5",
                group.count <= 2 ? "grid-cols-1" : "grid-cols-[repeat(3,max-content)]",
                // A phone has no room for three across: two across, so each group is narrower than the screen and
                // snaps into view whole.
                "max-md:grid-cols-[repeat(2,max-content)]",
              )}
            >
              {group.markets.map((market) => (
                <li key={market.id}>
                  <button
                    type="button"
                    aria-label={`${market.name}, ${market.statusLabel.toLowerCase()}`}
                    data-chip
                    onClick={() => select(market.id)}
                    className={cn(
                      "inline-flex h-7 w-full items-center gap-1.5 rounded-control border px-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] font-medium whitespace-nowrap text-ink transition-colors duration-[var(--dur-fast)]",
                      market.status === "on_track" && "border-border bg-surface hover:bg-surface-2",
                      market.status === "at_risk" &&
                        "border-transparent bg-warn-bg hover:border-warn-mark",
                      market.status === "off_track" &&
                        "border-transparent bg-bad-bg hover:border-bad-mark",
                    )}
                  >
                    <StatusGlyph status={market.status} />
                    {market.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
