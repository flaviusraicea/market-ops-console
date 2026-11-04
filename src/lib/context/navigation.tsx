"use client";

import {
  createContext,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";

import type { RawContext } from "./invariants";

type Navigation = readonly [isPending: boolean, start: TransitionStartFunction];
/** The context a write is moving to, shown at once while the server renders it; null when nothing is in flight. */
type Optimistic = readonly [next: RawContext | null, set: (next: RawContext | null) => void];

const NavigationContext = createContext<Navigation | null>(null);
const OptimisticContext = createContext<Optimistic | null>(null);

/**
 * One shared transition, so the progress bar shows for a write made by any widget, and one optimistic context,
 * so every control and selection moves on the click while the data follows (React drops it when the transition
 * commits).
 */
export function NavigationProvider({ children }: { children: ReactNode }) {
  const navigation = useTransition();
  const optimistic = useOptimistic<RawContext | null, RawContext | null>(null, (_, next) => next);
  return (
    <NavigationContext.Provider value={navigation}>
      <OptimisticContext.Provider value={optimistic}>{children}</OptimisticContext.Provider>
    </NavigationContext.Provider>
  );
}

/** The shared transition, or a local one where no provider is mounted (stories, tests). */
export function useNavigationTransition(): Navigation {
  const shared = useContext(NavigationContext);
  const local = useTransition();
  return shared ?? local;
}

/** The shared optimistic context, or a local one where no provider is mounted (stories, tests). */
export function useOptimisticContext(): Optimistic {
  const shared = useContext(OptimisticContext);
  const local = useOptimistic<RawContext | null, RawContext | null>(null, (_, next) => next);
  return shared ?? local;
}

/** How long a context change may take before the dashboard dims, so a fast response never flashes. */
export const SLOW_NAVIGATION_MS = 250;

/** True once `pending` has lasted SLOW_NAVIGATION_MS; false again as soon as it ends. */
export function useSlowPending(pending: boolean, delay = SLOW_NAVIGATION_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!pending) {
      // The dim must clear in the same commit the navigation settles in, not one timer later.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [pending, delay]);
  return slow;
}
