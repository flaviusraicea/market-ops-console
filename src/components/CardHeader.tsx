import type { ReactNode } from "react";

/**
 * One header grammar for every card (design-system 4.1 rule 3): title on the first line, optional
 * muted subtitle on the next, provenance caption and actions right-aligned on the title row.
 */
export function CardHeader({
  title,
  titleId,
  subtitleId,
  subtitle,
  caption,
  actions,
}: {
  title: ReactNode;
  titleId?: string;
  subtitleId?: string;
  subtitle?: ReactNode;
  caption?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div data-slot="card-header" className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3
          id={titleId}
          className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold tracking-[var(--text-title-ls)]"
        >
          {title}
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
      {subtitle ? (
        <p
          id={subtitleId}
          className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
