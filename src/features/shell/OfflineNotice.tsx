"use client";

import { useEffect, useRef, useState } from "react";

import { PageNotice } from "@/components/PageNotice";
import { isOffline, useNavigationGuard } from "@/lib/context/navigation";

/** How long Retry reads "Retrying…" when the connection is still down, so the press is seen to do something. */
const RETRY_FEEDBACK_MS = 600;

/**
 * Shown under the toolbar when a drill, chip, period or product change was held because the browser is offline.
 * The view and the conversation stay as they were. Retry sends the held change if the connection is back, and
 * otherwise says it is trying and stays; the notice leaves on a successful retry or on Dismiss, never on a timer.
 */
export function OfflineNotice() {
  const guard = useNavigationGuard();
  const [retrying, setRetrying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!guard) return null;
  const { held, release } = guard;
  return (
    <PageNotice
      tone="offline"
      open={held !== null}
      detail="showing the last view"
      retrying={retrying}
      onRetry={() => {
        if (!isOffline()) {
          held?.retry();
          return;
        }
        setRetrying(true);
        timer.current = setTimeout(() => setRetrying(false), RETRY_FEEDBACK_MS);
      }}
      onDismiss={release}
    >
      You&rsquo;re offline
    </PageNotice>
  );
}
