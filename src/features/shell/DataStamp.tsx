"use client";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { useLiveState } from "@/features/live/LiveProvider";
import { formatClock, formatPeriod } from "@/lib/format";

/**
 * Where the figures come from. With Live on it reads `LIVE · UPDATED 12:04:05` and the dot pulses; paused after
 * a tick it says the figures are simulated and when they stopped.
 */
export function DataStamp({ latestPeriod }: { latestPeriod: string }) {
  const { live, tick, updatedAt } = useLiveState();
  const clock = updatedAt ? formatClock(updatedAt) : null;
  if (live || (tick > 0 && clock)) {
    return (
      <Eyebrow
        title="Simulated figures for the latest month. Reload to return to the saved data."
        className="inline-flex items-center gap-1.5"
      >
        <span
          aria-hidden
          data-slot="live-dot"
          className={cn("size-1.5 rounded-pill bg-accent", live && "live-dot")}
        />
        {live ? `Live · updated ${clock}` : `Paused · simulated ${clock}`}
      </Eyebrow>
    );
  }
  return (
    <Eyebrow
      title={`Source: data.json, latest period ${latestPeriod}`}
      className="inline-flex items-center gap-1.5"
    >
      <span aria-hidden className="size-1.5 rounded-pill bg-ok-mark" />
      Data through {formatPeriod(latestPeriod)}
    </Eyebrow>
  );
}
