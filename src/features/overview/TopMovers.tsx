"use client";

import { ICON_STROKE, MessageSquareText } from "@/components/icons";
import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";
import { useAskWhy } from "@/features/assistant/askWhy";
import type { MoverVM, OverviewVM } from "./viewModel";

function Column({ title, items }: { title: string; items: MoverVM[] }) {
  const { prefill } = useAskWhy();
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ink-muted uppercase">
        {title}
      </h4>
      <ul>
        {items.map((m) => {
          return (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 border-t border-grid py-1 first:border-t-0"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{m.name}</span>
              <span
                className={cn(
                  "font-medium",
                  m.growth > 0 ? "text-ok-text" : m.growth < 0 ? "text-bad-text" : "text-ink-2",
                )}
              >
                {m.display}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={m.askWhy.aria}
                onClick={() => prefill(m.askWhy.text)}
              >
                <MessageSquareText aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TopMovers({ movers }: { movers: OverviewVM["movers"] }) {
  return (
    <section
      aria-labelledby="movers-h"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[var(--pad-card)]"
    >
      <h3
        id="movers-h"
        className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold tracking-[var(--text-title-ls)]"
      >
        Top movers
      </h3>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Column title="Rising" items={movers.rising} />
        <Column title="Falling" items={movers.falling} />
      </div>
      <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        Growth YoY, {movers.period} · Source · data.json
      </p>
    </section>
  );
}
