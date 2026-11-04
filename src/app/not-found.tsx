import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { SlimHeader } from "@/features/shell/SlimHeader";
import { cn } from "@/components/cn";

export const metadata: Metadata = { title: "Page not found · Market Ops" };

/** Any address the console does not serve: the shell's wordmark and theme switch, and one way back. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <SlimHeader />
      <main id="main" className="grid flex-1 place-items-center px-[var(--gutter)] py-12">
        <section
          aria-labelledby="not-found-heading"
          className="flex w-full max-w-md flex-col gap-4 rounded-sheet layer-overlay p-6"
        >
          <h1
            id="not-found-heading"
            className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold"
          >
            This page doesn’t exist
          </h1>
          <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
            The address may be mistyped or from an older version of the console. Nothing is lost:
            the portfolio is one click away.
          </p>
          <Link href="/" className={cn(buttonVariants({ variant: "secondary" }), "self-start")}>
            Back to the portfolio
          </Link>
        </section>
      </main>
    </div>
  );
}
