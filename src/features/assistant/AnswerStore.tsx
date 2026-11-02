"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Answer } from "./useAnswerMachine";

type Store = { latest: Answer | undefined; publish: (a: Answer | undefined) => void };
const StoreContext = createContext<Store>({ latest: undefined, publish: () => {} });

/** Mounted in Layout beside the dashboard and the panel, so widgets can read what the assistant last said. */
export function AnswerStoreProvider({ children }: { children: ReactNode }) {
  const [latest, publish] = useState<Answer | undefined>();
  const value = useMemo(() => ({ latest, publish }), [latest]);
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
