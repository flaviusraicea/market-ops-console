import type { ReactNode } from "react";

type LayoutProps = {
  header: ReactNode;
  dashboard: ReactNode;
  assistant: ReactNode;
};

/** Page grid (design-system.md section 4): dashboard column plus a 380 px assistant column from 1024 px up. */
export function Layout({ header, dashboard, assistant }: LayoutProps) {
  return (
    <>
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
          className="grid gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_var(--assistant-w)]"
        >
          <section aria-labelledby="dashboard-h" className="min-w-0">
            <h2 id="dashboard-h" className="sr-only">
              Dashboard
            </h2>
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
    </>
  );
}
