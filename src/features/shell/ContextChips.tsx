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
    <span className="inline-flex h-[var(--chip-h)] items-center gap-1 rounded-pill border border-border bg-surface-2 pr-1 pl-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2">
      <span>
        {label}: {value}
      </span>
      <button
        type="button"
        aria-label={clearLabel}
        onClick={onClear}
        className="inline-flex size-4 items-center justify-center rounded-pill hover:bg-border hover:text-ink"
      >
        <X aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
      </button>
    </span>
  );
}

export function ContextChips({
  period,
  latestPeriod,
  productName,
  onPeriod,
  onClearProduct,
}: {
  period: string;
  latestPeriod: string;
  productName?: string | undefined;
  onPeriod: (p: string) => void;
  onClearProduct: () => void;
}) {
  // The period chip only appears when the view is off the latest period; clearing returns to it.
  const offLatest = period !== latestPeriod;
  if (!offLatest && !productName) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {offLatest ? (
        <Chip
          label="Period"
          value={formatPeriod(period)}
          clearLabel="Clear period"
          onClear={() => onPeriod(latestPeriod)}
        />
      ) : null}
      {productName ? (
        <Chip
          label="Product"
          value={productName}
          clearLabel="Clear product"
          onClear={onClearProduct}
        />
      ) : null}
    </div>
  );
}
