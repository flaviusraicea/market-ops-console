import type { ReactNode } from "react";

import { CircleAlert, ICON_STROKE } from "@/components/icons";
import { cn } from "@/components/cn";

// Design-system.md 6.12: one component for stream errors, failed-save rollbacks and blocking errors.
export function Notice({
  title,
  children,
  actions,
  className,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-card border border-bad-mark bg-bad-bg p-[var(--pad-card)] shadow-[inset_4px_0_0_var(--bad-mark)]",
        className,
      )}
    >
      <CircleAlert
        aria-hidden
        className="mt-0.5 size-5 shrink-0 text-bad-text"
        strokeWidth={ICON_STROKE}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] font-semibold text-bad-text">
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
