import { ArrowRight, ICON_STROKE } from "@/components/icons";

export const SUGGESTIONS = [
  "Which markets are at risk?",
  "Why did Germany dip?",
  "What will sales be next year?",
] as const;

/** Full-width rows: a question is a sentence, so it gets a line of its own. Picking one sends it. */
export function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <ul className="flex flex-col gap-2" aria-label="Suggested questions">
      {SUGGESTIONS.map((text) => (
        <li key={text}>
          <button
            type="button"
            onClick={() => onPick(text)}
            className="flex h-10 w-full items-center justify-between gap-2 rounded-control border border-border bg-surface px-3 text-left text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink transition-colors duration-[var(--dur-fast)] hover:bg-surface-2"
          >
            {text}
            <ArrowRight
              aria-hidden
              className="size-3.5 shrink-0 text-ink-2"
              strokeWidth={ICON_STROKE}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
