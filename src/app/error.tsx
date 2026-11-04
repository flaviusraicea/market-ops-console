"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

import { cn } from "@/components/cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { SlimHeader } from "@/features/shell/SlimHeader";
import { reportError } from "@/lib/events";

/**
 * A throw that no widget boundary caught: the page's own view models, the layout's providers, the assistant. Next
 * would otherwise show its unstyled "Application error" screen. This is the not-found screen's shape with the
 * console's words: what happened, that nothing is lost (the URL is the state), and two ways on. The error is
 * reported through the same path as every other failure, so it appears in the event log and the server log with
 * its digest; the server side of the same error is logged by instrumentation.ts.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    reportError(error, { source: "boundary", widget: "page" });
  }, [error]);
  // A server component failed, so the segment is fetched again before it is rendered again.
  const tryAgain = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <SlimHeader />
      <main id="main" className="grid flex-1 place-items-center px-[var(--gutter)] py-12">
        <section
          aria-labelledby="error-heading"
          className="flex w-full max-w-md flex-col gap-4 rounded-sheet layer-overlay p-6"
        >
          <h1
            id="error-heading"
            className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold"
          >
            This view couldn’t be shown
          </h1>
          <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
            Something went wrong while drawing it. Nothing is lost: the address holds what you were
            looking at, so trying again brings it back.
            {error.digest ? (
              <>
                {" "}
                <span className="text-ink-muted">Reference {error.digest}.</span>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={tryAgain}>
              Try again
            </Button>
            {/* A plain anchor: a full load, in case the client itself is what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
              Back to the portfolio
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
