import type { ReactNode } from "react";

import { AnswerStoreProvider } from "@/features/assistant/AnswerStore";
import { AnswerMachineProvider } from "@/features/assistant/AnswerMachine";
import { AskWhyProvider } from "@/features/assistant/askWhy";
import { LiveProvider } from "@/features/live/LiveProvider";
import { PaletteProvider } from "@/features/palette/PaletteProvider";
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
          <LiveProvider>
            <AnswerMachineProvider>
              <PaletteProvider>
                <a
                  href="#main"
                  className="sr-only-focusable rounded-control bg-surface px-3 py-2 text-ink focus:fixed focus:top-2 focus:left-2 focus:z-50"
                >
                  Skip to content
                </a>
                {header}
                <div className="mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)] py-[var(--gap)] max-lg:pb-[calc(72px+env(safe-area-inset-bottom))]">
                  <ShellGrid dashboard={dashboard} assistant={assistant} />
                </div>
              </PaletteProvider>
            </AnswerMachineProvider>
          </LiveProvider>
        </AnswerStoreProvider>
      </AskWhyProvider>
    </AssistantRailProvider>
  );
}
