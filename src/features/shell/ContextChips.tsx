"use client";

import { formatPeriod } from "@/lib/format";
import { ICON_STROKE, X } from "@/components/icons";

function Chip({
  label,
  value,
  onClear,
  clearLabel,
}: {
  label: string;
  value: string;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <span className="inline-flex h-[var(--chip-h)] min-w-0 items-center gap-1 rounded-pill border border-border bg-surface-2 pr-1 pl-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2">
      <span className="truncate" title={`${label}: ${value}`}>
        {label}: {value}
      </span>
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="inline-flex size-4 shrink-0 items-center justify-center rounded-pill hover:bg-border hover:text-ink"
      >
        <X aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
      </button>
    </span>
  );
}

export function ContextChips({
  period,
  latestPeriod,
  onPeriod,
}: {
  period: string;
  latestPeriod: string;
  onPeriod: (p: string) => void;
}) {
  // Only the period chip lives here: the product is already shown by the Product select and the last crumb.
  // The period chip only appears when the view is off the latest period; clearing returns to it.
  const offLatest = period !== latestPeriod;
  if (!offLatest) return null;
  return (
    <div className="flex shrink-0 items-center gap-2">
      {offLatest ? (
        <Chip
          label="Period"
          value={formatPeriod(period)}
          clearLabel="Clear period"
          onClear={() => onPeriod(latestPeriod)}
        />
      ) : null}
    </div>
  );
}
