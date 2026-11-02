import { useId, type ReactNode, type Ref } from "react";

import { cn } from "@/components/cn";

/** Card chrome shared by the analyst widgets: title left, provenance caption right. */
export function AnalystCard({
  title,
  caption,
  className,
  children,
  landed = false,
  sectionRef,
}: {
  title: string;
  caption: string;
  className?: string;
  children: ReactNode;
  /** A followed citation points at this card: show the landing ring. */
  landed?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  const id = useId();
  return (
    <section
      ref={sectionRef}
      data-landed={landed ? "" : undefined}
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
