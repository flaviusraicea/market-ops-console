import { useId, type ReactNode } from "react";

import { cn } from "@/components/cn";

/** Card chrome shared by the analyst widgets: title left, provenance caption right. */
export function AnalystCard({
  title,
  caption,
  className,
  children,
}: {
  title: string;
  caption: string;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-[var(--pad-card)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3
          id={id}
          className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold tracking-[var(--text-title-ls)]"
        >
          {title}
        </h3>
        <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          {caption}
        </p>
      </div>
      {children}
    </section>
  );
}
