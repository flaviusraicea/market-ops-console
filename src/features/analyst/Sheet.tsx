import { useId, type CSSProperties, type ReactNode, type Ref } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { pageHeadingProps } from "@/lib/motion";

/** The Analyst ledger: one bordered surface whose sections are separated by rules, not cards. */
export function Sheet({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "flex min-w-0 flex-col divide-y divide-border rounded-card layer-card",
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
  pageHeading = false,
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
  /** This heading is where focus goes after a keyboard drill (see DashboardColumn). */
  pageHeading?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  const id = useId();
  return (
    <section
      ref={sectionRef}
      data-landing-target=""
      data-landed={landed ? "" : undefined}
      aria-labelledby={subtitle ? `${id} ${id}-sub` : id}
      className={cn("relative flex min-w-0 flex-col gap-2 p-[var(--pad-card)]", className)}
    >
      <div
        data-slot="card-header"
        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
      >
        <h3
          {...(pageHeading ? pageHeadingProps : {})}
          className="flex min-w-0 flex-wrap items-baseline gap-x-3"
        >
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
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
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
