"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";
import { CircleAlert, ICON_STROKE, Info, WifiOff, X } from "@/components/icons";

/** The icon each tone wears. Offline and fallback are statements, a load error is a fault. */
const TONES = {
  offline: { Icon: WifiOff, iconClass: "text-ink-muted" },
  fallback: { Icon: Info, iconClass: "text-ink-muted" },
  error: { Icon: CircleAlert, iconClass: "text-bad-mark" },
} as const;

export type PageNoticeTone = keyof typeof TONES;

const LEAVE_MS = 150;

/**
 * The page-level inline notice: one component for an offline navigation, a reset URL value and a failed load.
 * It sits in normal flow under the toolbar, so it pushes content down instead of covering it. A polite status,
 * never an alert: nothing here needs the reader's attention more than the view they are already on.
 * `open` drives the 150 ms exit, so a parent can keep rendering it while it fades.
 */
export function PageNotice({
  tone,
  open = true,
  children,
  detail,
  onRetry,
  retrying = false,
  onDismiss,
  className,
}: {
  tone: PageNoticeTone;
  open?: boolean;
  children: ReactNode;
  /** The quiet second clause after the middle dot. */
  detail?: string;
  /** Shows a Retry button. While `retrying` it reads "Retrying…" and is disabled. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Shows a Dismiss button and lets Escape close the notice. */
  onDismiss?: () => void;
  className?: string;
}) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      // Mounts again on the next open; the leaving timer below unmounts after the exit has played.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }
    const timer = setTimeout(() => setMounted(false), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open || !onDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);
  if (!mounted) return null;
  const { Icon, iconClass } = TONES[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="page-notice"
      data-tone={tone}
      data-leaving={!open}
      className={cn(
        "page-notice mb-[var(--gap-section)] flex items-center gap-2.5 rounded-card border border-border bg-surface-2 px-3 py-2.5",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", iconClass)} strokeWidth={ICON_STROKE} />
      <p className="min-w-0 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
        {children}
        {detail ? <span className="text-ink-muted"> · {detail}</span> : null}
      </p>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onRetry ? (
          <Button type="button" variant="ghost" size="sm" disabled={retrying} onClick={onRetry}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        ) : null}
        {onDismiss ? (
          <Button type="button" variant="ghost" size="sm" aria-label="Dismiss" onClick={onDismiss}>
            <X aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
