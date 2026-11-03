import type { ReactNode } from "react";

import { AnswerStoreProvider } from "@/features/assistant/AnswerStore";
import { AskWhyProvider } from "@/features/assistant/askWhy";
import { PaletteProvider } from "@/features/palette/PaletteProvider";

type LayoutProps = {
  header: ReactNode;
  dashboard: ReactNode;
  assistant: ReactNode;
};

/** Page grid (design-system.md section 4): dashboard column plus a 380 px assistant column from 1024 px up. */
export function Layout({ header, dashboard, assistant }: LayoutProps) {
  return (
    <AskWhyProvider>
      <AnswerStoreProvider>
        <PaletteProvider>
          <a
            href="#main"
            className="sr-only-focusable rounded-control bg-surface px-3 py-2 text-ink focus:fixed focus:top-2 focus:left-2 focus:z-50"
          >
            Skip to content
          </a>
          {header}
          <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--gap)]">
            <main
              id="main"
              tabIndex={-1}
              className="grid gap-[var(--gap)] outline-none lg:grid-cols-[minmax(0,1fr)_var(--assistant-w)]"
            >
              <section aria-label="Dashboard" className="min-w-0">
                {dashboard}
              </section>
              <aside aria-labelledby="assistant-h" className="min-w-0">
                <h2 id="assistant-h" className="sr-only">
                  Assistant
                </h2>
                {assistant}
              </aside>
            </main>
          </div>
        </PaletteProvider>
      </AnswerStoreProvider>
    </AskWhyProvider>
  );
}
