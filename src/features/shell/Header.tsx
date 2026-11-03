"use client";

import { cn } from "@/components/cn";
import type { Mode, Period } from "@/domain";
import { hrefFor } from "@/lib/context/href";
import { useConsoleMeta } from "@/lib/context/meta";
import { applyContextChange } from "@/lib/context/invariants";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useDensity } from "@/lib/density";
import type { ContextPatch } from "@/domain";
import { Breadcrumbs } from "./Breadcrumbs";
import { ContextChips } from "./ContextChips";
import { DataStamp } from "./DataStamp";
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
    <header
      className={cn(
        "relative border-b border-border bg-surface",
        mode === "analyst" && "sticky top-0 z-30",
      )}
    >
      <div
        aria-hidden
        data-slot="progress"
        data-pending={isPending}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-accent opacity-0 transition-opacity duration-[var(--dur-fast)] data-[pending=true]:opacity-100"
      />
      {/* One fixed row from 1024 px: the left group takes the slack and truncates, the right controls never wrap. Below that the header may wrap. */}
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-[var(--page-max)] flex-wrap items-center gap-x-4 gap-y-2 px-[var(--gutter)] py-2 lg:flex-nowrap">
        <div className="flex min-w-0 items-center gap-x-4 lg:flex-1">
          <div className="flex min-w-0 items-center">
            <h1 className="shrink-0 font-display text-lg leading-6 font-semibold whitespace-nowrap text-ink">
              Market Ops
            </h1>
            <span aria-hidden className="mx-4 h-5 w-px shrink-0 bg-border" />
            <Breadcrumbs trail={crumbs} onNavigate={(c) => setContext(c)} />
          </div>
          <ContextChips
            period={period}
            latestPeriod={latestPeriod}
            onPeriod={(p) => setContext({ period: p as Period })}
          />
        </div>
        <div className="flex shrink-0 items-center gap-x-3">
          {ctx.market && mode !== "analyst" ? (
            <ProductSelect
              product={ctx.product}
              products={products}
              onChange={(product) => setContext({ product })}
            />
          ) : null}
          {mode !== "analyst" ? (
            <PeriodSelect
              period={period}
              periods={periods}
              onChange={(p) => setContext({ period: p as Period })}
            />
          ) : null}
          <DataStamp latestPeriod={latestPeriod} />
          <ModeSwitch mode={mode} onChange={(m) => setContext({ mode: m })} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
