"use client";

import { formatPeriod } from "@/lib/format/number";
import { ICON_STROKE, X } from "@/ui/icons";

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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        label="Period"
        value={formatPeriod(period)}
        clearLabel="Clear period"
        onClear={() => onPeriod(latestPeriod)}
      />
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
