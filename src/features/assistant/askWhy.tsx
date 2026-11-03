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

import type { Entity, Period } from "@/domain";
import { useAssistantRail } from "@/features/shell/railState";

/** Where a question was asked from. `label` is what the question echo shows, e.g. "Germany · Mar 2026". */
export type AskContext = { entity: Entity; period?: Period; label: string };

/**
 * `fill` is false when the question was already sent, so the composer text should be left alone.
 * `from` names the widget a prefill came from ("the heat map cell"), for the composer's helper line.
 */
export type AskWhyRequest = {
  text: string;
  ctx?: AskContext;
  from?: string;
  fill: boolean;
  nonce: number;
};

/** Sends a question for the panel. Returns false when it cannot, for example while an answer streams. */
type Sender = (text: string, ctx?: AskContext) => boolean;

type Prefill = (text: string, ctx?: AskContext, from?: string) => void;
type Ask = (text: string, ctx?: AskContext) => void;

type AskWhyValue = {
  prefill: Prefill;
  ask: Ask;
  request: AskWhyRequest | null;
  /** True once per request: the first panel to apply it wins, so a remounted panel never replays it. */
  consume: (nonce: number) => boolean;
  registerSender: (sender: Sender) => () => void;
};

const NOOP: AskWhyValue = {
  prefill: () => {},
  ask: () => {},
  request: null,
  consume: () => false,
  registerSender: () => () => {},
};
const AskWhyContext = createContext<AskWhyValue>(NOOP);

/** Mounted once in Layout so any widget can put a question in the composer without owning the panel. */
export function AskWhyProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<AskWhyRequest | null>(null);
  const sender = useRef<Sender | null>(null);
  const consumed = useRef(0);
  const { openForEntry: openRail } = useAssistantRail();

  const publish = useCallback(
    (text: string, fill: boolean, ctx?: AskContext, from?: string) => {
      openRail();
      setRequest((prev) => ({
        text,
        fill,
        ...(ctx ? { ctx } : {}),
        ...(from ? { from } : {}),
        nonce: (prev?.nonce ?? 0) + 1,
      }));
    },
    [openRail],
  );
  const prefill = useCallback<Prefill>(
    (text, ctx, from) => publish(text, true, ctx, from),
    [publish],
  );
  // Falls back to filling the composer when the panel is busy or not mounted.
  const ask = useCallback<Ask>(
    (text, ctx) => publish(text, !(sender.current?.(text, ctx) ?? false), ctx),
    [publish],
  );
  const registerSender = useCallback((next: Sender) => {
    sender.current = next;
    return () => {
      if (sender.current === next) sender.current = null;
    };
  }, []);

  const consume = useCallback((nonce: number) => {
    if (nonce <= consumed.current) return false;
    consumed.current = nonce;
    return true;
  }, []);

  const value = useMemo(
    () => ({ prefill, ask, request, consume, registerSender }),
    [prefill, ask, request, consume, registerSender],
  );
  return <AskWhyContext.Provider value={value}>{children}</AskWhyContext.Provider>;
}

/**
 * `prefill` fills the composer, opens the assistant and focuses the composer, leaving the sending to the user.
 * `ask` also sends. `ctx` says where it was asked from.
 */
export function useAskWhy(): { prefill: Prefill; ask: Ask } {
  const { prefill, ask } = useContext(AskWhyContext);
  return { prefill, ask };
}

/** For the panel: the latest request, or null, and `consume`, which says whether this panel should apply it. */
export function useAskWhyRequest(): {
  request: AskWhyRequest | null;
  consume: (nonce: number) => boolean;
} {
  const { request, consume } = useContext(AskWhyContext);
  return { request, consume };
}

/** For the panel: tells `ask` how to send. The latest `send` is always the one used. */
export function useRegisterAskSender(send: Sender) {
  const { registerSender } = useContext(AskWhyContext);
  const latest = useRef(send);
  useEffect(() => {
    latest.current = send;
  });
  useEffect(() => registerSender((text, ctx) => latest.current(text, ctx)), [registerSender]);
}
