"use client";

import { cn } from "@/components/cn";
import type { Mode, Period } from "@/domain";
import { hrefFor } from "@/lib/context/href";
import { useConsoleMeta } from "@/lib/context/meta";
import { applyContextChange } from "@/lib/context/invariants";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useDensity } from "@/lib/density";
import type { ContextPatch } from "@/domain";
import { ConnectedLiveToggle } from "@/features/live/LiveToggle";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { Breadcrumbs } from "./Breadcrumbs";
import { DataStamp } from "./DataStamp";
import { ConnectedAvatarMenu } from "./ConnectedAvatarMenu";
import { ModeSwitch } from "./ModeSwitch";
import { ProductSelect, type ProductOption } from "./ProductSelect";
import { PeriodSelect } from "./PeriodSelect";
import { ThemeToggle } from "./ThemeToggle";

export type HeaderProps = {
  trail: readonly { label: string; ctx: ContextPatch }[];
  products: readonly ProductOption[];
  period: string;
  periods: readonly string[];
  latestPeriod: string;
  mode: Mode;
};

/** Design-system.md 6.1. Every write goes through setContext. */
// `period` and `mode` arrive from the server for the first paint; afterwards the URL (ctx) is the source of truth.
export function Header({ trail, products, periods, latestPeriod }: HeaderProps) {
  const { ctx, setContext, isPending } = useConsoleContext();
  const meta = useConsoleMeta();
  // A crumb keeps the current period and mode; its href is the URL setContext would write.
  // Server props drop keys set to undefined, so each crumb's drill scope is restated here.
  const crumbs = trail.map((c) => {
    const patch: ContextPatch = {
      region: undefined,
      market: undefined,
      product: undefined,
      ...c.ctx,
    };
    const change = applyContextChange(meta, ctx, patch);
    return { label: c.label, ctx: patch, href: change.ok ? hrefFor(meta, change.next) : "/" };
  });
  const { period, mode } = ctx;
  useDensity();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface shadow-header">
      <div
        aria-hidden
        data-slot="progress"
        data-pending={isPending}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-accent opacity-0 transition-opacity duration-[var(--dur-fast)] data-[pending=true]:opacity-100"
      />
      {/* One fixed row from 1024 px: the left group takes the slack and truncates, the right controls never wrap.
          Between 768 and 1023 px the header may wrap. Under 768 px it is two rows: wordmark, drill path, theme and
          account; then the period and the mode switch (the right group dissolves so each control can take its row). */}
      <div
        data-slot="header-row"
        className="mx-auto flex min-h-[var(--header-h)] max-w-[var(--page-max)] flex-wrap items-center gap-x-4 gap-y-2 px-[var(--gutter)] py-2 max-md:gap-x-2 lg:flex-nowrap"
      >
        <div className="flex min-w-0 items-center gap-x-4 max-md:order-1 max-md:flex-1 lg:flex-1">
          <div className="flex min-w-0 items-center">
            <h1 className="shrink-0 font-display text-lg leading-6 font-semibold whitespace-nowrap text-ink">
              Market Ops
            </h1>
            <span aria-hidden className="mx-4 h-5 w-px shrink-0 bg-border max-md:mx-3" />
            <Breadcrumbs trail={crumbs} onNavigate={(c) => setContext(c)} />
          </div>
        </div>
        <div className="flex items-center gap-x-3 max-md:contents md:max-lg:min-w-0 md:max-lg:flex-wrap md:max-lg:justify-end lg:shrink-0">
          {/* From 768 px the selects live in the page toolbar; the phone keeps them in row 2. */}
          {ctx.market && mode !== "analyst" ? (
            <div className="max-md:order-4 max-md:min-w-0 max-md:flex-1 md:hidden">
              <ProductSelect
                className="max-md:w-full"
                product={ctx.product}
                products={products}
                onChange={(product) => setContext({ product })}
              />
            </div>
          ) : null}
          {mode !== "analyst" ? (
            <div className="max-md:order-4 max-md:min-w-0 max-md:flex-1 md:hidden">
              <PeriodSelect
                period={period}
                periods={periods}
                onChange={(p) => setContext({ period: p as Period })}
                className="max-md:w-full"
              />
            </div>
          ) : null}
          <ConnectedLiveToggle className="max-md:hidden" />
          {/* The Overview eyebrow carries the stamp on a phone; Analyst has no eyebrow, so its row 2 does. */}
          <DataStamp
            latestPeriod={latestPeriod}
            className={cn(
              "max-md:order-4 max-md:min-w-0 max-md:flex-1 max-md:truncate",
              mode !== "analyst" && "max-md:hidden",
            )}
          />
          <div className="max-md:order-5">
            <ModeSwitch mode={mode} onChange={(m) => setContext({ mode: m })} />
          </div>
          <div className="flex items-center gap-x-1 max-md:order-2 md:contents">
            {/* From 1024 px search sits 8 px left of the theme toggle; below that the phone bar has it. */}
            <div className="flex items-center gap-x-2 max-lg:contents">
              <span className="flex max-lg:hidden">
                <PaletteButton />
              </span>
              <ThemeToggle />
            </div>
            <ConnectedAvatarMenu />
          </div>
          {/* The break between the two phone rows. */}
          <div
            aria-hidden
            className="hidden max-md:order-3 max-md:block max-md:h-0 max-md:basis-full"
          />
        </div>
      </div>
    </header>
  );
}
