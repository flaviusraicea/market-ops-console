"use client";

import { cn } from "@/components/cn";
import { ICON_STROKE, Radio } from "@/components/icons";
import { useLiveState } from "./LiveProvider";

const SEGMENT =
  "inline-flex h-full items-center gap-1 rounded-pill border px-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)]";

/**
 * Live · Paused. Two buttons in a labelled group; each reports its state with `aria-pressed`, so a screen reader
 * hears "Live, toggle button, pressed". Pausing freezes the figures where they are.
 */
export function LiveToggle({
  live,
  onChange,
  className,
}: {
  live: boolean;
  onChange: (live: boolean) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Live data"
      className={cn(
        "inline-flex h-[var(--control-h)] items-center rounded-pill bg-surface-2 p-0.5",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={live}
        onClick={() => onChange(true)}
        className={cn(
          SEGMENT,
          live
            ? "border-border bg-surface font-semibold text-ink"
            : "border-transparent font-medium text-ink-2 hover:text-ink",
        )}
      >
        <Radio aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
        Live
      </button>
      <button
        type="button"
        aria-pressed={!live}
        onClick={() => onChange(false)}
        className={cn(
          SEGMENT,
          !live
            ? "border-border bg-surface font-semibold text-ink"
            : "border-transparent font-medium text-ink-2 hover:text-ink",
        )}
      >
        Paused
      </button>
    </div>
  );
}

/** The toggle wired to the page's live state. */
export function ConnectedLiveToggle({ className }: { className?: string }) {
  const { live, setLive } = useLiveState();
  return <LiveToggle live={live} onChange={setLive} {...(className ? { className } : {})} />;
}
