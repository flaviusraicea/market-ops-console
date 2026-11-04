"use client";

import { useSyncExternalStore } from "react";

/** Live `matchMedia`. False on the server and during hydration, so first paint never depends on it. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The widths where the assistant is a docked column rather than a bottom sheet. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
/** Under 768 px: the phone layout. */
export const PHONE_QUERY = "(max-width: 767px)";
/** A touch screen as the main pointer. */
export const COARSE_QUERY = "(pointer: coarse)";
