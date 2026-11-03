"use client";

import Link from "next/link";

import type { ContextPatch } from "@/domain";
import { cn } from "@/components/cn";

export type Crumb = { label: string; ctx: ContextPatch; href: string };

export function Breadcrumbs({
  trail,
  onNavigate,
}: {
  trail: readonly Crumb[];
  onNavigate: (ctx: ContextPatch) => void;
}) {
  return (
    <nav aria-label="Drill path" className="min-w-0 flex-1">
      <ol className="flex w-full min-w-0 flex-nowrap items-center">
        {trail.map((crumb, i) => {
          const current = i === trail.length - 1;
          return (
            <li
              key={crumb.label}
              className={cn("flex items-center", current ? "max-w-full shrink-0" : "min-w-0")}
            >
              {i > 0 ? (
                <span aria-hidden className="mx-2 shrink-0 text-ink-muted">
                  ›
                </span>
              ) : null}
              {current ? (
                <span
                  aria-current="page"
                  title={crumb.label}
                  className="truncate text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-semibold text-ink"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  title={crumb.label}
                  onClick={(e) => {
                    // Modified clicks keep the browser's own behaviour (new tab, new window).
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                    e.preventDefault();
                    onNavigate(crumb.ctx);
                  }}
                  className={cn(
                    "truncate text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink-2",
                    "underline-offset-2 hover:underline focus-visible:underline",
                  )}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
