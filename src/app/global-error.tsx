"use client";

import { useEffect } from "react";

import { reportError } from "@/lib/events";
import "./globals.css";

/**
 * The last resort: the root layout itself failed, so this renders its own document. The stylesheet gives it the
 * tokens (the stored theme is not applied: the layout's script did not run, so the system scheme decides). A full
 * reload is the one recovery that does not depend on the code that just failed.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    reportError(error, { source: "boundary", widget: "root" });
  }, [error]);
  return (
    // The layout's font classes are not here either, so the UI font token falls back to the system face.
    <html lang="en" className="[--font-ui:system-ui,sans-serif]">
      <body className="grid min-h-dvh place-items-center bg-bg px-6 py-12 text-ink">
        <main
          id="main"
          aria-labelledby="global-error-heading"
          className="flex w-full max-w-md flex-col gap-4 rounded-sheet layer-overlay p-6"
        >
          <h1
            id="global-error-heading"
            className="text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold"
          >
            Market Ops couldn’t start
          </h1>
          <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
            Something went wrong before the console could draw. Reloading the page starts it again.
            {error.digest ? (
              <>
                {" "}
                <span className="text-ink-muted">Reference {error.digest}.</span>
              </>
            ) : null}
          </p>
          <div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-[var(--control-h)] items-center rounded-control bg-accent px-3 text-[length:var(--text-label)] font-medium text-on-accent hover:bg-accent-hover"
            >
              Reload the console
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
