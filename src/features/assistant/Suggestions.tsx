export const SUGGESTIONS = [
  "Which markets are at risk?",
  "Why did Germany dip?",
  "What will sales be next year?",
] as const;

export function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
      {SUGGESTIONS.map((text) => (
        <li key={text}>
          <button
            type="button"
            onClick={() => onPick(text)}
            className="inline-flex h-[var(--chip-h)] items-center rounded-pill bg-surface-2 px-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2 transition-colors duration-[var(--dur-fast)] hover:text-ink"
          >
            {text}
          </button>
        </li>
      ))}
    </ul>
  );
}
