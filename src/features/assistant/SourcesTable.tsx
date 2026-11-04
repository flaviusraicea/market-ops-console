import { ICON_STROKE, TriangleAlert } from "@/components/icons";
import { cn } from "@/components/cn";
import { Skeleton } from "@/components/ui/skeleton";
import type { SourceRow } from "./sourcesRows";

type SourcesTableProps = {
  rows: readonly SourceRow[];
  caption: string;
  loading?: boolean;
  placeholderRows?: number;
  /** Follows citation `i` (row `i` is citation `i`): the claim is the citation's link. */
  onFollow?: (i: number) => void;
};

const LABEL = "text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted";
const LINE = "text-[length:var(--text-label)] leading-[var(--text-label-lh)]";

/**
 * Design-system.md 6.9: what the answer cited, read from data.json. One stacked item per claim, so nothing scrolls
 * sideways in the 380 px panel: the claim (the citation's link), then entity and period, then the source's value
 * and what the assistant said, each labelled. The surface differs from the AI card on purpose, so it reads as
 * source data.
 */
export function SourcesTable({
  rows,
  caption,
  loading = false,
  placeholderRows = 3,
  onFollow,
}: SourcesTableProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <ol
        aria-label="Sources"
        aria-busy={loading || undefined}
        className="rounded-control border border-border bg-surface px-3"
      >
        {loading
          ? Array.from({ length: placeholderRows }, (_, i) => (
              <li
                key={i}
                className="flex flex-col gap-1.5 border-b border-border py-2.5 last:border-b-0"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </li>
            ))
          : rows.map((row, i) => (
              <li
                key={i}
                className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0"
              >
                <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
                  {row.disagreement ? (
                    <>
                      <TriangleAlert
                        aria-hidden
                        className="mr-1 inline size-3 align-[-1px] text-warn-text"
                        strokeWidth={ICON_STROKE}
                      />
                      <span className="sr-only">Differs from source: </span>
                    </>
                  ) : null}
                  {row.resolved && onFollow ? (
                    <button
                      type="button"
                      onClick={() => onFollow(i)}
                      className="cite-inline rounded-control text-left"
                    >
                      {row.claim}
                    </button>
                  ) : (
                    row.claim
                  )}
                </p>
                <p className={cn(LINE, "text-ink-muted")}>
                  {row.entity} · {row.period}
                </p>
                <p className={LINE}>
                  <span className={LABEL}>Source </span>
                  <span className="text-ink">{row.sourceValue}</span>
                </p>
                <p className={LINE}>
                  <span className={LABEL}>Assistant </span>
                  <span className={row.disagreement ? "text-warn-text" : "text-ai-label"}>
                    {row.assistant}
                  </span>
                </p>
              </li>
            ))}
      </ol>
      <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        {loading ? <span className="sr-only">Loading sources</span> : caption}
      </p>
    </div>
  );
}
