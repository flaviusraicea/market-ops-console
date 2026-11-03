"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useLiveState } from "@/features/live/LiveProvider";
import { PAGE_HEADING_ATTR, TWEEN_SETTLE_MS } from "@/lib/motion";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

/**
 * The dashboard column. While a context change is in flight it carries `data-pending` (globals.css dims it);
 * a drill started from the keyboard then moves focus to the new page heading, because the trigger is gone.
 */
export function DashboardColumn({ children }: { children: ReactNode }) {
  const { ctx, isPending } = useConsoleContext();
  const { tweening } = useLiveState();
  const ref = useRef<HTMLElement>(null);
  const scope = `${ctx.region ?? ""}|${ctx.market ?? ""}|${ctx.product ?? ""}`;
  // What was true when the navigation started: the drill scope, and whether the trigger showed a focus ring.
  // Marks tween only while a context change is in flight and just after it commits.
  const [settling, setSettling] = useState(false);
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

  useEffect(() => {
    if (isPending) {
      // Arms the tween before the new view commits; the timer below disarms it after.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettling(true);
      return;
    }
    const timer = setTimeout(() => setSettling(false), TWEEN_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [isPending]);

  return (
    <section
      ref={ref}
      aria-label="Dashboard"
      data-slot="dashboard"
      data-pending={isPending}
      data-tween={isPending || settling || tweening}
      className="min-w-0"
    >
      {children}
    </section>
  );
}
