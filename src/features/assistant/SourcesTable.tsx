import { ICON_STROKE, TriangleAlert } from "@/components/icons";
import { cn } from "@/components/cn";
import { EYEBROW_CLASS } from "@/components/Eyebrow";
import { Skeleton } from "@/components/ui/skeleton";
import type { SourceRow } from "./sourcesRows";

const HEADERS = ["Claim", "Entity", "Period", "Source value", "Assistant"] as const;

const CELL = "px-3 py-2 align-top";

type SourcesTableProps = {
  rows: readonly SourceRow[];
  caption: string;
  loading?: boolean;
  placeholderRows?: number;
};

/**
 * Design-system.md 6.9: what the answer cited, read from data.json. The surface colour differs from the
 * AI card on purpose, so the table reads as source data. Inside the 380 px panel it scrolls sideways in a
 * focusable region.
 */
export function SourcesTable({
  rows,
  caption,
  loading = false,
  placeholderRows = 3,
}: SourcesTableProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <div
        aria-busy={loading || undefined}
        role="region"
        aria-label="Sources table"
        tabIndex={0}
        className="overflow-x-auto rounded-control border border-border bg-surface [scrollbar-gutter:stable]"
      >
        <table className="w-full min-w-[560px] border-collapse [&_tr>:first-child]:sticky [&_tr>:first-child]:left-0 [&_tr>:first-child]:z-[1] [&_tbody_tr>:first-child]:bg-surface [&_thead_tr>:first-child]:bg-surface-2 text-left text-[length:var(--text-body-dense)] leading-[18px]">
          <caption className="sr-only">Sources cited by this answer</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {HEADERS.map((h) => (
                <th key={h} scope="col" className={cn(CELL, EYEBROW_CLASS, "text-ink-muted")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: placeholderRows }, (_, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    {HEADERS.map((h) => (
                      <td key={h} className={CELL}>
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr key={i} className="border-b border-border text-ink last:border-b-0">
                    <th scope="row" className={cn(CELL, "font-normal")}>
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
                      {row.claim}
                    </th>
                    <td className={cn(CELL, !row.resolved && "text-ink-muted")}>{row.entity}</td>
                    <td className={cn(CELL, "font-mono whitespace-nowrap")}>{row.period}</td>
                    <td className={CELL}>{row.sourceValue}</td>
                    <td className={cn(CELL, row.disagreement && "text-warn-text")}>
                      {row.assistant}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        {loading ? <span className="sr-only">Loading sources</span> : caption}
      </p>
    </div>
  );
}
