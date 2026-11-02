import { EmptyState } from "./EmptyState";

/** Slice 5 adds the answers. Until then it only renders the empty state. */
export function AnswerList({ onPick }: { onPick: (text: string) => void }) {
  return <EmptyState onPick={onPick} />;
}
