"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

type Navigation = readonly [isPending: boolean, start: TransitionStartFunction];

const NavigationContext = createContext<Navigation | null>(null);

/** One shared transition, so the progress bar shows for a write made by any widget. */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const value = useTransition();
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/** The shared transition, or a local one where no provider is mounted (stories, tests). */
export function useNavigationTransition(): Navigation {
  const shared = useContext(NavigationContext);
  const local = useTransition();
  return shared ?? local;
}
