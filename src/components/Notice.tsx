import type { ReactNode, Ref } from "react";

import { CircleAlert, Info, ICON_STROKE } from "@/components/icons";
import { cn } from "@/components/cn";

// Design-system.md 6.12: one component for stream errors, failed-save rollbacks and blocking errors.
// `neutral` is the same shape for a plain statement of fact (a permission, a limit): surface fill, accent rule.
export function Notice({
  title,
  children,
  actions,
  tone = "bad",
  className,
  noticeRef,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "bad" | "neutral";
  className?: string;
  /** For a notice that takes focus when it appears (a failed save): it becomes focusable by script, not by Tab. */
  noticeRef?: Ref<HTMLDivElement>;
}) {
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
