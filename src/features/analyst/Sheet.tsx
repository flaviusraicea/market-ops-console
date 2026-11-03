import { useId, type ReactNode, type Ref } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";

/** The Analyst ledger: one bordered surface whose sections are separated by rules, not cards. */
export function Sheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col divide-y divide-border rounded-card border border-border bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One ruled section of the sheet: eyebrow title, a muted subtitle on the same line, the provenance caption
 * and actions on the right. The eyebrow and subtitle name the region landmark.
 */
export function SheetSection({
  eyebrow,
  subtitle,
  caption,
  actions,
  className,
  children,
  landed = false,
  sectionRef,
}: {
  eyebrow: string;
  subtitle?: string;
  caption?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  /** A followed citation points at this section: show the landing ring. */
  landed?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  const id = useId();
  return (
    <section
      ref={sectionRef}
      data-landed={landed ? "" : undefined}
      aria-labelledby={subtitle ? `${id} ${id}-sub` : id}
      className={cn("flex min-w-0 flex-col gap-2 p-[var(--pad-card)]", className)}
    >
      <div
        data-slot="card-header"
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-3">
          <Eyebrow id={id} className="text-ink">
            {eyebrow}
          </Eyebrow>
          {subtitle ? (
            <span
              id={`${id}-sub`}
              className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-normal text-ink-muted"
            >
              {subtitle}
            </span>
          ) : null}
        </h3>
        {caption || actions ? (
          <div className="flex items-center gap-3">
            {caption ? (
              <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
                {caption}
              </p>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
