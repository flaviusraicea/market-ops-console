import { Eyebrow } from "@/components/Eyebrow";
import { Suggestions } from "./Suggestions";

/** What the empty state says about the view the user is looking at. All of it is derived from the data. */
export type PanelContext = { about: string; whatChanged: string };

/**
 * Shown until the first answer. The lilac block only says what the assistant will be asked about; the
 * "What changed" line is data, not AI, so it sits outside it on paper.
 */
export function EmptyState({
  context,
  onPick,
}: {
  context: PanelContext;
  onPick: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        data-ai
        className="flex flex-col gap-1 rounded-card border border-ai-border bg-ai-bg p-3"
      >
        <Eyebrow className="text-ai-label">Context</Eyebrow>
        <p className="font-medium text-ink">{context.about}</p>
      </div>
      <div className="flex flex-col gap-1 border-l-2 border-border pl-3">
        <p className="flex items-baseline gap-2">
          <Eyebrow>What changed</Eyebrow>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            Derived
          </span>
        </p>
        <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
          {context.whatChanged}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Eyebrow as="h3">Try asking</Eyebrow>
        <Suggestions onPick={onPick} />
      </div>
    </div>
  );
}
