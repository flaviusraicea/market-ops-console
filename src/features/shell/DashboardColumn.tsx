"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { useLiveState } from "@/features/live/LiveProvider";
import { PAGE_HEADING_ATTR, TWEEN_SETTLE_MS } from "@/lib/motion";
import { useSlowPending } from "@/lib/context/navigation";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

/**
 * The dashboard column. When a context change takes longer than 250 ms it carries `data-pending` (globals.css dims
 * it), so a fast response never flashes. A drill started from the keyboard then moves focus to the new page heading,
 * because the trigger is gone.
 */
export function DashboardColumn({ children }: { children: ReactNode }) {
  const { ctx, isPending } = useConsoleContext();
  const { tweening } = useLiveState();
  const slow = useSlowPending(isPending);
  const ref = useRef<HTMLElement>(null);
  const scope = `${ctx.region ?? ""}|${ctx.market ?? ""}|${ctx.product ?? ""}`;
  // What was true when the navigation started: the drill scope, and whether the trigger showed a focus ring.
  // Marks tween only while a context change is in flight and just after it commits.
  const [settling, setSettling] = useState(false);
  const started = useRef<{ scope: string; keyboard: boolean } | null>(null);
  // The scope on screen before the navigation: the optimistic context already shows the new one while pending.
  const settled = useRef(scope);

  useEffect(() => {
    if (isPending) {
      started.current ??= {
        scope: settled.current,
        keyboard: document.activeElement?.matches(":focus-visible") ?? false,
      };
      return;
    }
    const start = started.current;
    started.current = null;
    settled.current = scope;
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
      data-pending={slow}
      data-tween={isPending || settling || tweening}
      className="min-w-0"
    >
      {children}
    </section>
  );
}
