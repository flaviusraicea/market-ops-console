export const REDUCED_MOTION_KEY = "mo.reduced-motion";

/** True when the OS asks for reduced motion or the console's own override is on. Client only. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    document.documentElement.getAttribute("data-reduced-motion") === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The console's own Reduce motion switch. The attribute on <html> zeroes the duration tokens (tokens.css);
 * the choice is kept in localStorage and re-applied before first paint by the script in layout.tsx.
 */
export function setReducedMotionOverride(on: boolean): void {
  const root = document.documentElement;
  if (on) root.setAttribute("data-reduced-motion", "true");
  else root.removeAttribute("data-reduced-motion");
  try {
    if (on) window.localStorage.setItem(REDUCED_MOTION_KEY, "true");
    else window.localStorage.removeItem(REDUCED_MOTION_KEY);
  } catch {
    /* storage unavailable: the choice lasts for this page view only */
  }
}

/** Whether the console override (not the OS setting) is on. */
export function reducedMotionOverrideOn(): boolean {
  return document.documentElement.getAttribute("data-reduced-motion") === "true";
}
