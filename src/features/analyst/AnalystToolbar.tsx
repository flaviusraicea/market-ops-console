"use client";

import { Eyebrow } from "@/components/Eyebrow";
import { ICON_STROKE, Info, TableIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConnectedLiveToggle } from "@/features/live/LiveToggle";
import { PeriodSelect } from "@/features/shell/PeriodSelect";
import { ProductSelect, type ProductOption } from "@/features/shell/ProductSelect";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { Basis, Period } from "@/domain";
import { BasisSelector } from "./BasisSelector";

const NEEDS_MARKET = "Select a market first";

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
  const noMarket = !ctx.market;
  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label="Analyst controls"
        className="sticky top-[var(--header-h)] z-20 mb-[var(--gap-section)] flex min-h-10 items-center pointer-coarse:min-h-12 justify-between gap-4 overflow-x-auto border-b border-border bg-bg shadow-toolbar max-md:snap-x"
      >
        <div className="flex shrink-0 items-center gap-x-5">
          <div className="flex items-center gap-2 max-md:snap-start">
            <Eyebrow>Period</Eyebrow>
            <PeriodSelect
              period={ctx.period}
              periods={periods}
              onChange={(p) => setContext({ period: p as Period })}
            />
          </div>
          <div className="flex items-center gap-2 max-md:snap-start">
            <Eyebrow>Product</Eyebrow>
            {noMarket ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span role="group" tabIndex={0} aria-label={`Product. ${NEEDS_MARKET}.`}>
                    <ProductSelect
                      product={undefined}
                      products={products}
                      onChange={() => {}}
                      disabled
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{NEEDS_MARKET}</TooltipContent>
              </Tooltip>
            ) : (
              <ProductSelect
                product={ctx.product}
                products={products}
                onChange={(product) => setContext({ product })}
              />
            )}
          </div>
          <div className="max-md:snap-start">
            <BasisSelector
              basis={basis}
              matDisabled={matDisabled}
              matFallback={ctx.basis === "mat" && basis === "month"}
            />
          </div>
          <div className="max-md:snap-start">
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
          </div>
        </div>
        {/* The header carries the toggle from 768 px; below that it lives here. */}
        <div className="shrink-0 md:hidden">
          <ConnectedLiveToggle />
        </div>
        <div data-slot="toolbar-end" className="shrink-0">
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
        </div>
      </div>
    </TooltipProvider>
  );
}
