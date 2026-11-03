"use client";

import { ICON_STROKE, MessageSquareText } from "@/components/icons";
import { cn } from "@/components/cn";
import { CardHeader } from "@/components/CardHeader";
import { Eyebrow } from "@/components/Eyebrow";
import { Button } from "@/components/ui/button";
import { useAskWhy } from "@/features/assistant/askWhy";
import type { MoverVM, OverviewVM } from "./viewModel";

function Column({ title, items }: { title: string; items: MoverVM[] }) {
  const { prefill } = useAskWhy();
  return (
    <div className="min-w-0">
      <Eyebrow as="h4" className="mb-1 block">
        {title}
      </Eyebrow>
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
                  "num font-medium",
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
      <CardHeader title="Top movers" titleId="movers-h" />
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Column title="Rising" items={movers.rising} />
        <Column title="Lowest growth" items={movers.falling} />
      </div>
      <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
        Growth YoY, {movers.period} · Source · data.json
      </p>
    </section>
  );
}
