"use client";

import { Eyebrow } from "@/components/Eyebrow";
import { SegmentedControl } from "@/components/SegmentedControl";
import type { Basis } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

const MAT_HINT = "Needs 12 months of data";

/** Month, YTD or MAT. Writes `basis` to the URL; MAT is unavailable before twelve months exist. */
export function BasisSelector({ basis, matDisabled }: { basis: Basis; matDisabled: boolean }) {
  const { setContext } = useConsoleContext();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
      {matDisabled ? (
        <span id="basis-mat-hint" className="sr-only">
          {MAT_HINT}
        </span>
      ) : null}
      <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
        Applies to the tiles and the map
      </span>
    </div>
  );
}
