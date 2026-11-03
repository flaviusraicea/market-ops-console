"use client";

import { ICON_STROKE, Info, TableIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectedLiveToggle } from "@/features/live/LiveToggle";
import { PageToolbar } from "@/features/shell/PageToolbar";
import type { ProductOption } from "@/features/shell/ProductSelect";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { Basis } from "@/domain";
import { BasisSelector } from "./BasisSelector";

/**
 * The sticky Analyst toolbar under the header: period, product, basis and the status rule. These are the
 * controls the sheet reads from; every write goes through `setContext`.
 */
export function AnalystToolbar({
  periods,
  products,
  basis,
  matDisabled,
  statusRule,
}: {
  periods: readonly string[];
  products: readonly ProductOption[];
  basis: Basis;
  matDisabled: boolean;
  statusRule: string;
}) {
  const { ctx, setContext } = useConsoleContext();
  return (
    <PageToolbar
      label="Analyst controls"
      periods={periods}
      products={products}
      extra={
        <>
          <div className="max-md:snap-start">
            <BasisSelector
              basis={basis}
              matDisabled={matDisabled}
              matFallback={ctx.basis === "mat" && basis === "month"}
            />
          </div>
          <div className="max-md:snap-start">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-control text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2 underline decoration-border underline-offset-4 hover:text-ink"
                  >
                    <Info aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
                    Status rule
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-72">{statusRule}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </>
      }
      trailing={
        /* The header carries the toggle from 768 px; below that it lives here. */
        <div className="shrink-0 md:hidden">
          <ConnectedLiveToggle />
        </div>
      }
      end={
        <Button
          type="button"
          variant="ghost"
          aria-expanded={Boolean(ctx.facts)}
          onClick={() =>
            setContext({ facts: ctx.facts ? undefined : true }, { history: "replace" })
          }
        >
          <TableIcon aria-hidden strokeWidth={ICON_STROKE} />
          {ctx.facts ? "Hide facts" : "All facts"}
        </Button>
      }
    />
  );
}
