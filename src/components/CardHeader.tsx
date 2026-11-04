import type { ReactNode } from "react";

/**
 * One header grammar for every card (design-system 4.1 rule 3): title on the first line, optional
 * muted subtitle on the next, actions right-aligned on the title row. The provenance caption is not in the
 * header: it sits bottom-right of the card body (`CardCaption`).
 */
export function CardHeader({
  title,
  titleId,
  subtitleId,
  subtitle,
  actions,
}: {
  title: ReactNode;
  titleId?: string;
  subtitleId?: string;
  subtitle?: ReactNode;
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
        {actions ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{actions}</div>
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

/** The provenance line of a card ("Derived · …", "Source · data.json"): bottom-right of the card body. */
/** The card's last line. `mt-auto` keeps it at the bottom of a card stretched by its row, and the card's own gap
 * spaces it, so no margin stacks on top of that gap. */
export function CardCaption({ children }: { children: ReactNode }) {
  return (
    <p className="mt-auto self-end text-right text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
      {children}
    </p>
  );
}
