"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Answer } from "./useAnswerMachine";

/** The chip the reader followed: `cite` in the URL means this chip of this answer, never of a later one. */
export type Followed = { answerId: string; index: number };

type Store = {
  latest: Answer | undefined;
  publish: (a: Answer | undefined) => void;
  followed: Followed | null;
  follow: (f: Followed | null) => void;
};
const StoreContext = createContext<Store>({
  latest: undefined,
  publish: () => {},
  followed: null,
  follow: () => {},
});

/** Mounted in Layout beside the dashboard and the panel, so widgets can read what the assistant last said. */
export function AnswerStoreProvider({ children }: { children: ReactNode }) {
  const [latest, publish] = useState<Answer | undefined>();
  const [followed, follow] = useState<Followed | null>(null);
  const value = useMemo(() => ({ latest, publish, followed, follow }), [latest, followed]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** The newest answer in the session, or undefined. */
export function useLatestAnswer(): Answer | undefined {
  return useContext(StoreContext).latest;
}

/** For the panel: keeps the store in step with its answer list. */
export function usePublishAnswers(answers: readonly Answer[]) {
  const { publish } = useContext(StoreContext);
  const latest = answers[answers.length - 1];
  useEffect(() => publish(latest), [latest, publish]);
}

/** Which chip of which answer the URL's `cite` refers to, and the setter CitationRow uses when one is followed. */
export function useFollowed() {
  const { followed, follow } = useContext(StoreContext);
  return { followed, follow };
}
