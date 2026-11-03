/** How long marks keep their tween after new data commits (a little over --dur-chart, 240 ms). */
export const TWEEN_SETTLE_MS = 300;

/** Keys that scroll the page or a list. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

/**
 * Calls `cb` when the reader scrolls: the wheel, a touch drag, or a scrolling key that is not being typed into a
 * field. Listeners go when `signal` aborts. Client only.
 */
export function onScrollIntent(cb: () => void, signal: AbortSignal): void {
  const onKey = (e: KeyboardEvent) => {
    const typing =
      e.target instanceof HTMLElement && e.target.matches("input, textarea, [contenteditable]");
    if (!typing && SCROLL_KEYS.has(e.key)) cb();
  };
  window.addEventListener("wheel", cb, { passive: true, signal });
  window.addEventListener("touchmove", cb, { passive: true, signal });
  window.addEventListener("keydown", onKey, { signal });
}

/**
 * A time custom property in ms. The CSS minifier rewrites "2000ms" as "2s" and "150ms" as ".15s", so the unit is
 * read. Client only.
 */
export function cssMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : fallback;
}

export const REDUCED_MOTION_KEY = "mo.reduced-motion";

/** True when the OS asks for reduced motion or the console's own override is on. Client only. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return isMotionOverrideOn() || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The console's own reduce-motion override (the `data-reduced-motion` attribute on <html>). Client only. */
export function isMotionOverrideOn(): boolean {
  return document.documentElement.getAttribute("data-reduced-motion") === "true";
}

/**
 * Turns the console's Reduce motion switch on or off. The attribute on <html> zeroes the duration tokens
 * (tokens.css); the choice is kept in localStorage and re-applied before first paint by the script in layout.tsx.
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

/** Flips the switch (the palette's "Turn reduce motion on/off") and remembers it. */
export function toggleMotionOverride(): void {
  setReducedMotionOverride(!isMotionOverrideOn());
}

/** The element that a keyboard drill lands on: the page's own heading, marked by the view that renders it. */
export const PAGE_HEADING_ATTR = "data-page-heading";
/** Spread onto the heading that a keyboard drill should focus (DashboardColumn finds it by the attribute). */
export const pageHeadingProps = { [PAGE_HEADING_ATTR]: "", tabIndex: -1 } as const;
