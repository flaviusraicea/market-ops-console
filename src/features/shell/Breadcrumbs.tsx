"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

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
  // Under 768 px the path is as wide as it needs to be and scrolls inside its own space, opening at the end so
  // the current page and its parent are the ones in view; every crumb keeps a full-size touch target.
  const nav = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = nav.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [trail]);
  return (
    <nav
      ref={nav}
      aria-label="Drill path"
      className="min-w-0 flex-1 max-md:overflow-x-auto max-md:[scrollbar-width:none]"
    >
      <ol className="flex w-full min-w-0 flex-nowrap items-center max-md:w-max">
        {trail.map((crumb, i) => {
          const current = i === trail.length - 1;
          return (
            <li
              key={crumb.label}
              className={cn(
                "flex items-center max-md:shrink-0",
                current ? "max-w-full shrink-0" : "min-w-0",
              )}
            >
              {i > 0 ? (
                <span aria-hidden className="mx-2 shrink-0 text-ink-muted max-md:mx-1">
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
                    "truncate text-[length:var(--text-label)] leading-[var(--text-label-lh)] pointer-coarse:leading-11 font-medium text-ink-2",
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
