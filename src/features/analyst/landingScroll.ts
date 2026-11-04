/** Loaded on the first landing scroll, so the Overview's first-load bundle does not carry it. */
const GAP = 16;

/**
 * The scroll position that centres a widget in the visible area, between the sticky toolbar's bottom edge and the
 * viewport bottom. A widget taller than that area aligns its top `GAP` below the toolbar instead.
 * `scrollIntoView({ block: "center" })` would centre against the whole window, behind the toolbar.
 */
export function centredScrollTop({
  targetTop,
  targetHeight,
  scrollY,
  toolbarBottom,
  viewportHeight,
}: {
  /** The widget's `getBoundingClientRect().top`. */
  targetTop: number;
  targetHeight: number;
  scrollY: number;
  toolbarBottom: number;
  viewportHeight: number;
}): number {
  const avail = viewportHeight - toolbarBottom;
  const offset = targetHeight > avail ? GAP : (avail - targetHeight) / 2;
  return Math.max(0, targetTop + scrollY - toolbarBottom - offset);
}

/** Scrolls the window so `element` sits centred under the sticky toolbar. */
export function scrollToCentre(element: HTMLElement, smooth: boolean) {
  const toolbar = document.querySelector("[data-slot=page-toolbar]");
  const header = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue("--header-h"),
  );
  // The toolbar sticks 8px under the header; measure where it sticks, not where it sits before the scroll.
  const toolbarBottom =
    (Number.isFinite(header) ? header : 0) + 8 + (toolbar?.getBoundingClientRect().height ?? 0);
  const rect = element.getBoundingClientRect();
  window.scrollTo({
    top: centredScrollTop({
      targetTop: rect.top,
      targetHeight: rect.height,
      scrollY: window.scrollY,
      toolbarBottom,
      viewportHeight: window.innerHeight,
    }),
    behavior: smooth ? "smooth" : "auto",
  });
}
