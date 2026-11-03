"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useConsoleContext } from "@/lib/context/useConsoleContext";

/** The element that a keyboard drill lands on: the page's own heading, marked by the view that renders it. */
export const PAGE_HEADING_ATTR = "data-page-heading";

/**
 * The dashboard column. While a context change is in flight it carries `data-pending` (globals.css dims it);
 * a drill started from the keyboard then moves focus to the new page heading, because the trigger is gone.
 */
export function DashboardColumn({ children }: { children: ReactNode }) {
  const { ctx, isPending } = useConsoleContext();
  const ref = useRef<HTMLElement>(null);
  const scope = `${ctx.region ?? ""}|${ctx.market ?? ""}|${ctx.product ?? ""}`;
  // What was true when the navigation started: the drill scope, and whether the trigger showed a focus ring.
  const started = useRef<{ scope: string; keyboard: boolean } | null>(null);

  useEffect(() => {
    if (isPending) {
      started.current ??= {
        scope,
        keyboard: document.activeElement?.matches(":focus-visible") ?? false,
      };
      return;
    }
    const start = started.current;
    started.current = null;
    if (start?.keyboard && start.scope !== scope) {
      ref.current?.querySelector<HTMLElement>(`[${PAGE_HEADING_ATTR}]`)?.focus();
    }
  }, [isPending, scope]);

  return (
    <section
      ref={ref}
      aria-label="Dashboard"
      data-slot="dashboard"
      data-pending={isPending}
      className="min-w-0"
    >
      {children}
    </section>
  );
}
