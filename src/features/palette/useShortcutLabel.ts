"use client";

import { useHydrated } from "@/lib/useHydrated";

/** Apple keyboards say ⌘; everything else says Ctrl. */
export function isApplePlatform(nav: Pick<Navigator, "platform" | "userAgent">): boolean {
  const platform =
    (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    nav.platform ??
    nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * The palette shortcut as this keyboard writes it: "⌘K" on Apple devices, "Ctrl K" elsewhere. Empty on the server and
 * during hydration, so the wrong one never flashes.
 */
export function useShortcutLabel(): string {
  const hydrated = useHydrated();
  if (!hydrated) return "";
  return isApplePlatform(navigator) ? "⌘K" : "Ctrl K";
}
