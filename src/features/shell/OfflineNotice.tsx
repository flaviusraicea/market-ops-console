"use client";

import { Notice } from "@/components/Notice";
import { useNavigationGuard } from "@/lib/context/navigation";

/**
 * Shown under the toolbar when a drill, chip, period or product change was held because the browser is offline.
 * The view and the conversation stay as they were. Retry asks the server and sends the held change; the notice
 * stays until that change has landed, and leaves on Dismiss or Escape otherwise, never on a timer.
 */
export function OfflineNotice() {
  const guard = useNavigationGuard();
  if (!guard) return null;
  return (
    <Notice
      tone="offline"
      title="You’re offline"
      detail="showing the last view"
      open={guard.held !== null}
      retrying={guard.retrying}
      onRetry={guard.retry}
      onDismiss={guard.release}
    />
  );
}
