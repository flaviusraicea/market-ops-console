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

/** The widths where the assistant is a column or overlay rather than a block under the dashboard. */
export const DESKTOP_QUERY = "(min-width: 1024px)";
/** Desktop but narrower than 1280 px: the open assistant overlays the dashboard. */
export const OVERLAY_QUERY = "(min-width: 1024px) and (max-width: 1279px)";
/** Under 768 px: the phone layout. */
export const PHONE_QUERY = "(max-width: 767px)";
/** A touch screen as the main pointer. */
export const COARSE_QUERY = "(pointer: coarse)";
