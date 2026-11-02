import type { ReactNode } from "react";

export function Layout({ header, children }: { header: ReactNode; children: ReactNode }) {
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
        {children}
      </div>
    </>
  );
}
