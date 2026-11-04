"use client";

import { useEffect, useState } from "react";

import { Notice } from "@/components/Notice";
import type { ContextReset } from "@/lib/context/reset";

/**
 * Tells the reader that the address they opened held a value the console does not have, and what it shows
 * instead. The page renders the fallback without redirecting; this replaces the address with the one on screen
 * (so a copied link and Back show the view) and keeps the sentence until Dismiss or Escape. A later navigation
 * renders the page without a reset, which closes it.
 */
export function ResetNotice({ reset, href }: { reset: ContextReset | null; href: string }) {
  const [shown] = useState(reset);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (reset) window.history.replaceState(window.history.state, "", href);
  }, [reset, href]);
  if (!shown) return null;
  return (
    <Notice
      tone="fallback"
      title={shown.title}
      open={reset !== null && !dismissed}
      onDismiss={() => setDismissed(true)}
    >
      {shown.detail}
    </Notice>
  );
}
