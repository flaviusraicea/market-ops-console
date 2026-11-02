"use client";

import type { Mode, Period } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useDensity } from "@/lib/density";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { ContextChips } from "./ContextChips";
import { DataStamp } from "./DataStamp";
import { ModeSwitch } from "./ModeSwitch";
import { PeriodSelect } from "./PeriodSelect";
import { ThemeToggle } from "./ThemeToggle";

export type HeaderProps = {
  trail: readonly Crumb[];
  period: string;
  periods: readonly string[];
  latestPeriod: string;
  mode: Mode;
  productName?: string | undefined;
};

/** Design-system.md 6.1. Every write goes through setContext. */
// `period` and `mode` arrive from the server for the first paint; afterwards the URL (ctx) is the source of truth.
export function Header({ trail, periods, latestPeriod, productName }: HeaderProps) {
  const { ctx, setContext } = useConsoleContext();
  const { period, mode } = ctx;
  useDensity();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex min-h-[var(--header-h)] max-w-[var(--page-max)] flex-wrap items-center gap-x-4 gap-y-2 px-[var(--gutter)] py-2">
        <div className="flex items-center">
          <h1 className="font-display text-lg leading-6 font-semibold text-ink">Market Ops</h1>
          <span aria-hidden className="mx-4 h-5 w-px bg-border" />
          <Breadcrumbs trail={trail} onNavigate={(c) => setContext(c)} />
        </div>
        <ContextChips
          period={period}
          latestPeriod={latestPeriod}
          productName={productName}
          onPeriod={(p) => setContext({ period: p as Period })}
          onClearProduct={() => setContext({ product: undefined })}
        />
        <div className="flex-1" />
        <PeriodSelect
          period={period}
          periods={periods}
          onChange={(p) => setContext({ period: p as Period })}
        />
        <DataStamp latestPeriod={latestPeriod} />
        <ModeSwitch mode={mode} onChange={(m) => setContext({ mode: m })} />
        <ThemeToggle />
      </div>
    </header>
  );
}
