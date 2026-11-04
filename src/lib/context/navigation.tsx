"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

type Navigation = readonly [isPending: boolean, start: TransitionStartFunction];

/**
 * A navigation that did not start because the browser is offline. Next would answer a failed server round trip
 * by leaving the page for the browser's error screen, which loses the view and the conversation; holding the
 * change here keeps both and lets Retry send it once the server answers.
 */
export type HeldNavigation = {
  /** Issues the held change again, through the same offline check as the first time. */
  retry: () => void;
  /** The control the reader used, marked busy while the retry runs. */
  source: HTMLElement | null;
};

type Guard = {
  held: HeldNavigation | null;
  /** True from Retry until the held navigation has landed. */
  retrying: boolean;
  /** True while a retried navigation is in flight: the notice stays until it lands instead of closing at once. */
  sendingRef: { current: boolean };
  hold: (nav: Omit<HeldNavigation, "source">) => void;
  /** Drops the hold: a new navigation supersedes it, or the reader dismissed the notice. */
  release: () => void;
  /** Re-issues the held change. Offline it is held again and the same notice stays; online it is sent. */
  retry: () => void;
};

/** Controls a reader acts on to navigate: the nearest one around the event target is the one marked busy. */
const ACTIONABLE =
  'button, a[href], [role="button"], [role="gridcell"], tr[tabindex], [role="row"]';

/** Longest the notice waits for a sent navigation to show as pending before it assumes it has landed. */
const SETTLE_FALLBACK_MS = 1500;

const NavigationContext = createContext<Navigation | null>(null);
const GuardContext = createContext<Guard | null>(null);

/** One shared transition, so the progress bar shows for a write made by any widget. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const value = useTransition();
  const [pending] = value;
  const [held, setHeld] = useState<HeldNavigation | null>(null);
  const [retrying, setRetrying] = useState(false);
  const lastControl = useRef<HTMLElement | null>(null);
  const sentAt = useRef<number | null>(null);
  const sawPending = useRef(false);

  // Remember what the reader last pressed, so a held navigation can show which control is waiting.
  useEffect(() => {
    const remember = (e: Event) => {
      if (!(e.target instanceof Element)) return;
      // A press inside the notice (Retry, Dismiss) is not the navigation the reader asked for.
      if (e.target.closest('[data-slot="page-notice"]')) return;
      const target = e.target.closest<HTMLElement>(ACTIONABLE);
      if (target) lastControl.current = target;
    };
    document.addEventListener("pointerdown", remember, true);
    document.addEventListener("keydown", remember, true);
    return () => {
      document.removeEventListener("pointerdown", remember, true);
      document.removeEventListener("keydown", remember, true);
    };
  }, []);

  const sendingRef = useRef(false);
  const hold = useCallback((nav: Omit<HeldNavigation, "source">) => {
    sendingRef.current = false;
    sentAt.current = null;
    setRetrying(false);
    setHeld({ ...nav, source: lastControl.current });
  }, []);
  const release = useCallback(() => {
    sendingRef.current = false;
    sentAt.current = null;
    setRetrying(false);
    setHeld(null);
  }, []);

  const retry = useCallback(() => {
    if (!held || retrying) return;
    setRetrying(true);
    sendingRef.current = true;
    sawPending.current = false;
    sentAt.current = performance.now();
    held.retry();
  }, [held, retrying]);

  // The notice leaves only once the sent navigation has shown as pending and finished; if it never shows as
  // pending (the URL did not change), a short fallback lets it go instead of hanging.
  useEffect(() => {
    if (sentAt.current === null) return;
    if (pending) {
      sawPending.current = true;
      return;
    }
    if (sawPending.current) {
      release();
      return;
    }
    const timer = setTimeout(release, SETTLE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [pending, retrying, release]);

  // Mark the waiting control busy while the retry runs (notice-spec: opacity .6, progress cursor, aria-busy).
  const source = held?.source ?? null;
  useEffect(() => {
    if (!retrying || !source?.isConnected) return;
    source.setAttribute("aria-busy", "true");
    source.setAttribute("data-nav-busy", "");
    return () => {
      source.removeAttribute("aria-busy");
      source.removeAttribute("data-nav-busy");
    };
  }, [retrying, source]);

  const guard = useMemo(
    () => ({ held, retrying, sendingRef, hold, release, retry }),
    [held, retrying, hold, release, retry],
  );
  return (
    <NavigationContext.Provider value={value}>
      <GuardContext.Provider value={guard}>{children}</GuardContext.Provider>
    </NavigationContext.Provider>
  );
}

/** The shared transition, or a local one where no provider is mounted (stories, tests). */
export function useNavigationTransition(): Navigation {
  const shared = useContext(NavigationContext);
  const local = useTransition();
  return shared ?? local;
}

/** The offline hold, or null where no provider is mounted (stories, tests): navigation then proceeds as before. */
export function useNavigationGuard(): Guard | null {
  return useContext(GuardContext);
}

/** Whether the browser reports no connection. Absent `navigator` (server render) counts as online. */
export const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
