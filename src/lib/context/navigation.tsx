"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

type Navigation = readonly [isPending: boolean, start: TransitionStartFunction];

/**
 * A navigation that did not start because the browser is offline. Next would answer a failed server round trip
 * by leaving the page for the browser's error screen, which loses the view and the conversation; holding the
 * change here keeps both and lets Retry send it when the connection is back.
 */
export type HeldNavigation = { retry: () => void };

type Guard = {
  held: HeldNavigation | null;
  hold: (nav: HeldNavigation) => void;
  release: () => void;
};

const NavigationContext = createContext<Navigation | null>(null);
const GuardContext = createContext<Guard | null>(null);

/** One shared transition, so the progress bar shows for a write made by any widget. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const value = useTransition();
  const [held, setHeld] = useState<HeldNavigation | null>(null);
  const hold = useCallback((nav: HeldNavigation) => setHeld(nav), []);
  const release = useCallback(() => setHeld(null), []);
  const guard = useMemo(() => ({ held, hold, release }), [held, hold, release]);
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
