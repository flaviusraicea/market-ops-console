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
 * One ruled section of the sheet: eyebrow title and a muted subtitle on the same line, the actions (the
 * View as table toggle) on the right, top-aligned with the eyebrow. The provenance caption sits bottom-right of
 * the card body, never in the title row. The eyebrow and subtitle name the region landmark.
 */
export function SheetSection({
  eyebrow,
  subtitle,
  caption,
  actions,
  legend,
  className,
  children,
  landed = false,
  pageHeading = false,
  allProducts = false,
  sectionRef,
}: {
  eyebrow: string;
  subtitle?: string;
  caption?: string;
  actions?: ReactNode;
  /** A series legend: its own row under the title and subtitle, at every width. Scale legends stay under their chart. */
  legend?: ReactNode;
  className?: string;
  children: ReactNode;
  /** A followed citation points at this section: show the landing ring. */
  landed?: boolean;
  /** This heading is where focus goes after a keyboard drill (see DashboardColumn). */
  pageHeading?: boolean;
  /** A product is selected but this section still shows all products, so its title steps back. */
  allProducts?: boolean;
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
        className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 md:flex-nowrap"
      >
        <h3
          {...(pageHeading ? pageHeadingProps : {})}
          className="flex min-w-0 flex-wrap items-baseline gap-x-3 md:flex-1"
        >
          <Eyebrow id={id} className={allProducts ? "text-ink-2" : "text-ink"}>
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
        {actions ? (
          <div className="flex flex-wrap items-start justify-end gap-x-3 gap-y-2 md:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
      {legend}
      {children}
      {caption ? (
        <p className="mt-2 self-end text-right text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
          {caption}
        </p>
      ) : null}
    </section>
  );
}
