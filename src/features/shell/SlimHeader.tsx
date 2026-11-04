import type { ReactNode } from "react";

/** The wordmark row of the screens that stand outside the console (sign-in, not found): no drill path, no selects. */
export function SlimHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-[var(--page-max)] items-center justify-between px-[var(--gutter)] py-3">
      <span className="font-display text-lg leading-6 font-semibold">Market Ops</span>
      {children}
    </header>
  );
}
