"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Period } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { PeriodSelect } from "./PeriodSelect";
import { ProductSelect, type ProductOption } from "./ProductSelect";

const NEEDS_MARKET = "Select a market first";

/**
 * The one sticky toolbar under the header, shared by both modes, drawn as a floating card: 8px below the header, on
 * the same column edges as the cards under it, card shadow at rest and the raised shadow once it is stuck (a 1px
 * sentinel above it reports that; the shadow change is an opacity fade on a pseudo-element). Period and Product always, Product disabled
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
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // The card sticks 8px under the header; the sentinel has left the visible area once it passes that line.
    const top =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) + 8;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < top);
      },
      { rootMargin: `-${top}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <TooltipProvider>
      <div ref={sentinel} aria-hidden data-slot="toolbar-sentinel" className="h-px -mb-px" />
      <div
        role="toolbar"
        aria-label={label}
        data-slot="page-toolbar"
        data-chrome=""
        data-stuck={stuck}
        className={cn(
          "sticky top-[var(--sticky-top)] z-20 mb-[var(--gap-section)] h-12 rounded-sheet border border-border bg-surface-raised shadow-card",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-sheet after:opacity-0 after:shadow-raised after:transition-opacity after:duration-150 after:content-[''] data-[stuck=true]:after:opacity-100",
          className,
        )}
      >
        {/* Overflow scrolls inside the card, so the card's own shadow is never clipped. The More menu that folds the
            end actions below 1200px is deferred; until then the row scrolls. */}
        <div className="flex h-full items-center justify-between gap-4 overflow-x-auto px-4 max-md:snap-x">
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
      </div>
    </TooltipProvider>
  );
}
