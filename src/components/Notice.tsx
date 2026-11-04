"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";

import { CircleAlert, Info, WifiOff, X, ICON_STROKE } from "@/components/icons";
import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";

/** The one notice of the console (notice-spec): an inline row, never a stripe, a toast or an overlay. */
const TONES = {
  offline: { Icon: WifiOff, iconClass: "text-ink-muted" },
  fallback: { Icon: Info, iconClass: "text-ink-muted" },
  error: { Icon: CircleAlert, iconClass: "text-bad-mark" },
} as const;

export type NoticeTone = keyof typeof TONES;

type NoticeProps = {
  /** The notice's sentence, in `--ink`. */
  title: string;
  /** The quiet second clause after the middle dot, in `--ink-muted`. */
  children?: ReactNode;
  /** Buttons at the right edge. Retry and Dismiss are built in; this is for any other action. */
  actions?: ReactNode;
  tone?: NoticeTone;
  className?: string;
  /** For a notice that takes focus when it appears (a failed save): it becomes focusable by script, not by Tab. */
  noticeRef?: Ref<HTMLDivElement>;
  /** Shows a ghost Retry; while `retrying` it reads "Retrying…" and is disabled. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Shows an icon-only Dismiss and, for a page notice, lets Escape close it. */
  onDismiss?: () => void;
  /**
   * Makes this a page notice: it sits under the toolbar 8 px below it, enters and leaves with a short fade, and
   * is announced politely through a live region that stays mounted. `open={false}` plays the exit and unmounts.
   * Leave it out for a notice that is simply part of its card.
   */
  open?: boolean;
};

const LEAVE_MS = 150;

export function Notice(props: NoticeProps) {
  return props.open === undefined ? (
    <Row {...props} />
  ) : (
    <PageNotice {...props} open={props.open} />
  );
}

/** The shell: surface-2, 1 px border, card radius, 10/12 padding, no shadow. Icon, text, then actions. */
function Row({
  title,
  children,
  actions,
  tone = "error",
  className,
  noticeRef,
  onRetry,
  retrying = false,
  onDismiss,
  page = false,
  leaving = false,
}: NoticeProps & { page?: boolean; leaving?: boolean }) {
  const { Icon, iconClass } = TONES[tone];
  return (
    <div
      ref={noticeRef}
      tabIndex={noticeRef ? -1 : undefined}
      // A failure that needs the reader's eye is an alert; a statement of fact is a note. A page notice is
      // announced by its host instead, politely.
      role={page ? undefined : tone === "error" ? "alert" : "note"}
      data-slot={page ? "page-notice" : "notice"}
      data-tone={tone}
      data-leaving={leaving}
      className={cn(
        "flex items-center gap-2.5 rounded-sheet border border-border bg-surface-2 px-3 py-2.5",
        page &&
          // The toolbar above carries the section gap; pull up to the spec's 8 px and restore the gap below.
          "page-notice mt-[calc(8px-var(--gap-section))] mb-[var(--gap-section)]",
        className,
      )}
    >
      <Icon aria-hidden className={cn("size-4 shrink-0", iconClass)} strokeWidth={ICON_STROKE} />
      <p className="min-w-0 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
        <span>{title}</span>
        {children ? (
          <>
            <span aria-hidden className="text-ink-muted">
              {" · "}
            </span>
            <span className="text-ink-muted">{children}</span>
          </>
        ) : null}
      </p>
      {actions || onRetry || onDismiss ? (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {actions}
          {onRetry ? (
            <Button type="button" variant="ghost" size="sm" disabled={retrying} onClick={onRetry}>
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          ) : null}
          {onDismiss ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Dismiss"
              onClick={onDismiss}
            >
              <X aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A page notice. The polite live host is always mounted and only its content comes and goes, because a live
 * region that arrives already filled is not announced by every screen reader. It is `aria-live` without the
 * status role: the shell's own announcer is the one status landmark.
 */
function PageNotice({ open, onDismiss, ...rest }: NoticeProps & { open: boolean }) {
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
  return (
    <div aria-live="polite" aria-atomic="true" data-slot="notice-host">
      {mounted ? (
        <Row {...rest} {...(onDismiss ? { onDismiss } : {})} page leaving={!open} />
      ) : null}
    </div>
  );
}
