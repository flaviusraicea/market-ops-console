"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Period } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { PeriodSelect } from "./PeriodSelect";
import { ProductSelect, type ProductOption } from "./ProductSelect";

const NEEDS_MARKET = "Select a market first";

/**
 * The one sticky toolbar under the header, shared by both modes: Period and Product always, Product disabled
 * (with the reason in a tooltip) until a market is chosen. `extra` adds mode-specific controls beside them and
 * `end` sits at the right edge. Every write goes through `setContext`.
 */
export function PageToolbar({
  periods,
  products,
  label,
  extra,
  trailing,
  end,
  className,
}: {
  periods: readonly string[];
  products: readonly ProductOption[];
  /** Names the toolbar for assistive technology. */
  label: string;
  extra?: ReactNode;
  /** Sits between the controls and the end slot (the phone live toggle). */
  trailing?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  const { ctx, setContext } = useConsoleContext();
  const noMarket = !ctx.market;
  return (
    <TooltipProvider>
      <div
        role="toolbar"
        aria-label={label}
        data-slot="page-toolbar"
        className={cn(
          "sticky top-[var(--header-h)] z-20 mb-[var(--gap-section)] flex min-h-10 items-center justify-between gap-4 overflow-x-auto border-b border-border bg-bg shadow-toolbar pointer-coarse:min-h-12 max-md:snap-x",
          className,
        )}
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
          {extra}
        </div>
        {trailing}
        {end ? (
          <div data-slot="toolbar-end" className="shrink-0">
            {end}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}
