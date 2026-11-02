"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type AskWhyRequest = { text: string; nonce: number };

type AskWhyValue = { prefill: (text: string) => void; request: AskWhyRequest | null };

const NOOP: AskWhyValue = { prefill: () => {}, request: null };
const AskWhyContext = createContext<AskWhyValue>(NOOP);

/** Mounted once in Layout so any widget can put a question in the composer without owning the panel. */
export function AskWhyProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AskWhyRequest | null>(null);
  const prefill = useCallback(
    (text: string) => setRequest((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );
  const value = useMemo(() => ({ prefill, request }), [prefill, request]);
  return <AskWhyContext.Provider value={value}>{children}</AskWhyContext.Provider>;
}

/** Fills the composer with a question. Until slice 9 it does not send. */
export function useAskWhy(): { prefill: (text: string) => void } {
  return { prefill: useContext(AskWhyContext).prefill };
}

/** For the panel: the latest prefill request, or null. Each request has a new nonce, so repeats re-apply. */
export function useAskWhyRequest(): AskWhyRequest | null {
  return useContext(AskWhyContext).request;
}
