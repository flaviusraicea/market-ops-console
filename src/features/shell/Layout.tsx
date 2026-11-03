import type { ReactNode } from "react";

import { AnswerStoreProvider } from "@/features/assistant/AnswerStore";
import { AskWhyProvider } from "@/features/assistant/askWhy";
import { AssistantRailProvider } from "./railState";
import { ShellGrid } from "./ShellGrid";

type LayoutProps = {
  header: ReactNode;
  dashboard: ReactNode;
  assistant: ReactNode;
};

/** Page grid (design-system.md section 4): dashboard column plus the assistant, open (380 px) or collapsed to a rail (48 px). */
export function Layout({ header, dashboard, assistant }: LayoutProps) {
  return (
    <AssistantRailProvider>
      <AskWhyProvider>
        <AnswerStoreProvider>
          <a
            href="#main"
            className="sr-only-focusable rounded-control bg-surface px-3 py-2 text-ink focus:fixed focus:top-2 focus:left-2 focus:z-50"
          >
            Skip to content
          </a>
          {header}
          <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--gap)]">
            <ShellGrid dashboard={dashboard} assistant={assistant} />
          </div>
        </AnswerStoreProvider>
      </AskWhyProvider>
    </AssistantRailProvider>
  );
}
