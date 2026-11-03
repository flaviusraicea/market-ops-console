"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Answer } from "./useAnswerMachine";

/** The chip the reader followed. `n` counts follows, so following the same chip again is a new landing. */
export type Followed = { answerId: string; index: number; n: number };

type Store = { latest: Answer | undefined; publish: (a: Answer | undefined) => void };
const StoreContext = createContext<Store>({ latest: undefined, publish: () => {} });

// Apart from the store so that following a chip does not re-render everything that reads the answers.
type FollowedStore = {
  followed: Followed | null;
  follow: (answerId: string, index: number) => void;
};
const FollowedContext = createContext<FollowedStore>({ followed: null, follow: () => {} });

/** Mounted in Layout beside the dashboard and the panel, so widgets can read what the assistant last said. */
export function AnswerStoreProvider({ children }: { children: ReactNode }) {
  const [latest, publish] = useState<Answer | undefined>();
  const value = useMemo(() => ({ latest, publish }), [latest]);
  const [followed, setFollowed] = useState<Followed | null>(null);
  const follow = useCallback(
    (answerId: string, index: number) =>
      setFollowed((prev) => ({ answerId, index, n: (prev?.n ?? 0) + 1 })),
    [],
  );
  const followedValue = useMemo(() => ({ followed, follow }), [followed, follow]);
  return (
    <StoreContext.Provider value={value}>
      <FollowedContext.Provider value={followedValue}>{children}</FollowedContext.Provider>
    </StoreContext.Provider>
  );
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

/** The chip the reader last followed, and the setter CitationRow uses when one is followed. */
export function useFollowed() {
  return useContext(FollowedContext);
}
