"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** `fill` is false when the question was already sent, so the composer text should be left alone. */
export type AskWhyRequest = { text: string; fill: boolean; nonce: number };

/** Sends a question for the panel. Returns false when it cannot, for example while an answer streams. */
type Sender = (text: string, about?: string) => boolean;

type AskWhyValue = {
  prefill: (text: string) => void;
  ask: (text: string, about?: string) => void;
  request: AskWhyRequest | null;
  registerSender: (sender: Sender) => () => void;
};

const NOOP: AskWhyValue = {
  prefill: () => {},
  ask: () => {},
  request: null,
  registerSender: () => () => {},
};
const AskWhyContext = createContext<AskWhyValue>(NOOP);

/** Mounted once in Layout so any widget can put a question in the composer without owning the panel. */
export function AskWhyProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AskWhyRequest | null>(null);
  const sender = useRef<Sender | null>(null);

  const publish = useCallback(
    (text: string, fill: boolean) =>
      setRequest((prev) => ({ text, fill, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );
  const prefill = useCallback((text: string) => publish(text, true), [publish]);
  // Falls back to filling the composer when the panel is busy or not mounted.
  const ask = useCallback(
    (text: string, about?: string) => publish(text, !(sender.current?.(text, about) ?? false)),
    [publish],
  );
  const registerSender = useCallback((next: Sender) => {
    sender.current = next;
    return () => {
      if (sender.current === next) sender.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({ prefill, ask, request, registerSender }),
    [prefill, ask, request, registerSender],
  );
  return <AskWhyContext.Provider value={value}>{children}</AskWhyContext.Provider>;
}

/** `prefill` fills the composer and focuses it, leaving the sending to the user. `ask` also sends; `about` says where it was asked from. */
export function useAskWhy(): {
  prefill: (text: string) => void;
  ask: (text: string, about?: string) => void;
} {
  const { prefill, ask } = useContext(AskWhyContext);
  return { prefill, ask };
}

/** For the panel: the latest request, or null. Each request has a new nonce, so repeats re-apply. */
export function useAskWhyRequest(): AskWhyRequest | null {
  return useContext(AskWhyContext).request;
}

/** For the panel: tells `ask` how to send. The latest `send` is always the one used. */
export function useRegisterAskSender(send: Sender) {
  const { registerSender } = useContext(AskWhyContext);
  const latest = useRef(send);
  useEffect(() => {
    latest.current = send;
  });
  useEffect(() => registerSender((text, about) => latest.current(text, about)), [registerSender]);
}
