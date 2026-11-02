import { Suggestions } from "./Suggestions";

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
        Ask about markets, products or periods. Answers cite the data they use.
      </p>
      <Suggestions onPick={onPick} />
    </div>
  );
}
