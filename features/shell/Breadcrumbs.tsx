"use client";

import type { ContextPatch } from "@/domain";
import { cn } from "@/ui/utils";

export type Crumb = { label: string; ctx: ContextPatch };

export function Breadcrumbs({
  trail,
  onNavigate,
}: {
  trail: readonly Crumb[];
  onNavigate: (ctx: ContextPatch) => void;
}) {
  return (
    <nav aria-label="Drill path" className="min-w-0">
      <ol className="flex flex-wrap items-center">
        {trail.map((crumb, i) => {
          const current = i === trail.length - 1;
          return (
            <li key={crumb.label} className="flex items-center">
              {i > 0 ? (
                <span aria-hidden className="mx-2 text-ink-muted">
                  ›
                </span>
              ) : null}
              {current ? (
                <span
                  aria-current="page"
                  className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-semibold text-ink"
                >
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.ctx)}
                  className={cn(
                    "text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2",
                    "underline-offset-2 hover:underline focus-visible:underline",
                  )}
                >
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
