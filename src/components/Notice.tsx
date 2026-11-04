"use client";

import { useEffect, useState, type ReactNode, type Ref } from "react";

import { CircleAlert, Info, WifiOff, X, ICON_STROKE } from "@/components/icons";
import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";

// Design-system.md 6.12: one component for stream errors, failed-save rollbacks and blocking errors.
// `neutral` is the same shape for a plain statement of fact (a permission, a limit): surface fill, accent rule.

/** The tones that render as the page-level inline row (notice-spec): no stripe, in flow, with Retry and Dismiss. */
const INLINE = {
  offline: { Icon: WifiOff, iconClass: "text-ink-muted" },
  fallback: { Icon: Info, iconClass: "text-ink-muted" },
  error: { Icon: CircleAlert, iconClass: "text-bad-mark" },
} as const;

export type NoticeTone = "bad" | "neutral" | keyof typeof INLINE;

type NoticeProps = {
  /** The notice's headline. For the inline tones it is the whole sentence. */
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: NoticeTone;
  className?: string;
  /** For a notice that takes focus when it appears (a failed save): it becomes focusable by script, not by Tab. */
  noticeRef?: Ref<HTMLDivElement>;
  /** Inline tones only: the quiet second clause after the middle dot. */
  detail?: string;
  /** Inline tones only: shows Retry; while `retrying` it reads "Retrying…" and is disabled. */
  onRetry?: () => void;
  retrying?: boolean;
  /** Inline tones only: shows Dismiss and lets Escape close the notice. */
  onDismiss?: () => void;
  /** Inline tones only: false plays the exit and unmounts. The live region stays mounted either way. */
  open?: boolean;
};

export function Notice(props: NoticeProps) {
  if (props.tone === "offline" || props.tone === "fallback" || props.tone === "error") {
    return <InlineNotice {...props} tone={props.tone} />;
  }
  return <BlockNotice {...props} />;
}

const LEAVE_MS = 150;

/**
 * The page-level inline notice: an offline navigation, a reset URL value or a failed load. It sits in normal flow
 * under the toolbar, 8 px below it, so it pushes content down instead of covering it. The polite status host is
 * always mounted and only its content comes and goes (a polite live region without the status role, which the
 * shell's own announcer already owns), because a live region that arrives already filled is not
 * announced by every screen reader.
 */
function InlineNotice({
  tone,
  title,
  detail,
  open = true,
  onRetry,
  retrying = false,
  onDismiss,
  className,
}: NoticeProps & { tone: keyof typeof INLINE }) {
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
  const { Icon, iconClass } = INLINE[tone];
  return (
    <div aria-live="polite" aria-atomic="true" data-slot="notice-host">
      {mounted ? (
        <div
          data-slot="page-notice"
          data-tone={tone}
          data-leaving={!open}
          className={cn(
            // The toolbar above carries the section gap; pull up to the spec's 8 px and restore the gap below.
            "page-notice mt-[calc(8px-var(--gap-section))] mb-[var(--gap-section)] flex items-center gap-2.5 rounded-card border border-border bg-surface-2 px-3 py-2.5",
            className,
          )}
        >
          <Icon
            aria-hidden
            className={cn("size-4 shrink-0", iconClass)}
            strokeWidth={ICON_STROKE}
          />
          <p className="min-w-0 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
            {title}
            {detail ? <span className="text-ink-muted"> · {detail}</span> : null}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1">
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
        </div>
      ) : null}
    </div>
  );
}

function BlockNotice({
  title,
  children,
  actions,
  tone = "bad",
  className,
  noticeRef,
}: NoticeProps) {
  const neutral = tone === "neutral";
  const Icon = neutral ? Info : CircleAlert;
  return (
    <div
      ref={noticeRef}
      tabIndex={noticeRef ? -1 : undefined}
      role={neutral ? "note" : "alert"}
      className={cn(
        "flex gap-3 rounded-card border p-[var(--pad-card)]",
        neutral
          ? "border-border bg-surface-2 shadow-[inset_4px_0_0_var(--accent)]"
          : "border-bad-mark bg-bad-bg shadow-[inset_4px_0_0_var(--bad-mark)]",
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", neutral ? "text-accent" : "text-bad-text")}
        strokeWidth={ICON_STROKE}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={cn(
            "text-[length:var(--text-body)] leading-[var(--text-body-lh)] font-semibold",
            neutral ? "text-ink" : "text-bad-text",
          )}
        >
          {title}
        </p>
        {children ? (
          <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
            {children}
          </p>
        ) : null}
        {actions ? <div className="mt-2 flex gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
