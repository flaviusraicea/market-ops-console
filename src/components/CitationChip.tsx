import { cn } from "@/components/cn";
import { ICON_STROKE, Link2, TriangleAlert } from "@/components/icons";

export type CitationChipProps = {
  label: string;
  /** A domain `Resolution` fits: only its `ok` flag matters here (components may not import the domain). */
  resolved: { ok: boolean };
  pressed: boolean;
  onFollow: () => void;
  /** Position in the answer's citation order; builds the ids the description elements use. */
  index: number;
  /** DOM id of the button, so inline citations can move focus to it. */
  id?: string;
  /** Slice 7: the assistant's claim differs from the source status. */
  disagreement?: { assistant: string; source: string } | undefined;
};

/** Design-system.md 6.5: a pill button that moves the dashboard to what the citation points at. */
export function CitationChip({
  label,
  resolved,
  pressed,
  onFollow,
  index,
  id,
  disagreement,
}: CitationChipProps) {
  const unresolved = !resolved.ok;
  const descriptionId = `${id ?? "chip"}-desc-${index}`;
  const description = unresolved
    ? "Could not resolve this citation"
    : disagreement
      ? `Assistant says ${disagreement.assistant}; source data says ${disagreement.source}`
      : undefined;

  return (
    <span title={unresolved ? "Could not resolve this citation" : undefined}>
      <button
        type="button"
        id={id}
        aria-label={`Go to ${label}`}
        aria-pressed={pressed}
        aria-describedby={description ? descriptionId : undefined}
        disabled={unresolved}
        data-chip
        onClick={onFollow}
        className={cn(
          "inline-flex h-[var(--chip-h)] items-center gap-1 rounded-pill border px-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] transition-colors duration-[var(--dur-fast)]",
          unresolved
            ? "cursor-not-allowed border-dashed border-ink-muted bg-transparent text-ink-muted"
            : pressed
              ? "border-accent bg-accent text-on-accent"
              : "border-transparent bg-accent-soft text-accent hover:border-accent",
        )}
      >
        <Link2 aria-hidden className="size-3 shrink-0" strokeWidth={ICON_STROKE} />
        {label}
        {disagreement && !unresolved ? (
          <TriangleAlert
            aria-hidden
            className={cn("size-3 shrink-0", pressed ? "text-on-accent" : "text-warn-text")}
            strokeWidth={ICON_STROKE}
          />
        ) : null}
      </button>
      {description ? (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      ) : null}
    </span>
  );
}
