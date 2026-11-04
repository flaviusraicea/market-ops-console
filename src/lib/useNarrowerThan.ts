"use client";

import { useEffect, useState } from "react";

/**
 * Whether an element is narrower than `px`, following resizes. For a choice CSS container queries cannot
 * make, such as whether to render a tooltip, which portals out of the container. Attach `attach` as the
 * element's ref. False until measured, so the server render is the wide layout.
 */
export function useNarrowerThan(px: number) {
  const [el, attach] = useState<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setNarrow(entry.contentRect.width < px);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, px]);
  return { attach, narrow };
}
