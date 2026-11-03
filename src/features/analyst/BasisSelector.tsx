"use client";

import { Eyebrow } from "@/components/Eyebrow";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { Basis } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

const MAT_HINT = "Needs 12 months of data";

/** Month, YTD or MAT (applies to the KPI strip and the map). Writes `basis` to the URL; MAT is unavailable before twelve months exist. */
export function BasisSelector({
  basis,
  matDisabled,
  matFallback = false,
}: {
  basis: Basis;
  matDisabled: boolean;
  /** MAT was asked for in the URL but is not available for this period. */
  matFallback?: boolean;
}) {
  const { setContext } = useConsoleContext();
  return (
    <div className="flex items-center gap-2">
      <Eyebrow id="basis-label">Basis</Eyebrow>
      <SegmentedControl<Basis>
        labelledBy="basis-label"
        value={basis}
        onChange={(next) => setContext({ basis: next })}
        options={[
          { value: "month", label: "Month" },
          { value: "ytd", label: "YTD" },
          {
            value: "mat",
            label: "MAT",
            disabled: matDisabled,
            hint: MAT_HINT,
            hintId: "basis-mat-hint",
          },
        ]}
      />
      {matFallback ? (
        <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] whitespace-nowrap text-ink-muted">
          MAT unavailable, showing Month
        </span>
      ) : null}
      {matDisabled ? (
        <span id="basis-mat-hint" className="sr-only">
          {MAT_HINT}
        </span>
      ) : null}
    </div>
  );
}
