/** True when the OS asks for reduced motion or the console's own override is on. Client only. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return isMotionOverrideOn() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The console's own reduce-motion override (the `data-reduced-motion` attribute on <html>). Client only. */
export function isMotionOverrideOn(): boolean {
  return document.documentElement.getAttribute("data-reduced-motion") === "true";
}

export function toggleMotionOverride(): void {
  const root = document.documentElement;
  if (isMotionOverrideOn()) root.removeAttribute("data-reduced-motion");
  else root.setAttribute("data-reduced-motion", "true");
}
