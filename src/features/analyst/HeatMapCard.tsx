"use client";

import { HeatMap, HeatMapTable } from "@/components/charts/HeatMap";
import { Legend } from "@/components/charts/Legend";
import { ATTAINMENT_LEGEND } from "@/components/charts/scales";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import type { Period } from "@/domain";
import { formatPeriodAbbr } from "@/lib/format";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext, cellQuestion } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SheetSection } from "./Sheet";
import type { HeatMapVM } from "./viewModel";

export function HeatMapCard({ vm, className }: { vm: HeatMapVM; className?: string }) {
  const { setContext } = useConsoleContext();
  const { prefill } = useAskWhy();
  const picked = vm.selected && vm.rows.find((r) => r.id === vm.selected?.market);
  const hint = `${picked && vm.selected ? `${formatPeriodAbbr(vm.selected.period)} is the outlined cell in the ${picked.name} row. ` : ""}Shift+Enter on a focused cell asks about it.`;
  return (
    <SheetSection
      eyebrow="Attainment by month"
      subtitle={vm.subtitle}
      caption={vm.caption}
      {...(className ? { className } : {})}
    >
      <ViewAsTable
        toolbar={
          <Legend
            label="Attainment colour scale"
            items={ATTAINMENT_LEGEND.map((b) => ({
              label: b.label,
              swatch: "fill",
              color: b.token,
            }))}
          />
        }
        chart={
          <>
            <HeatMap
              rows={vm.rows}
              periods={vm.periods}
              selected={vm.selected}
              label={vm.title}
              onCell={(market, period) => setContext({ market, period: period as Period })}
              onAsk={({ market, marketName, period, momPct }) =>
                prefill(
                  cellQuestion(marketName, period, momPct),
                  askContext({ kind: "market", marketId: market }, marketName, period as Period),
                  "the heat map cell",
                )
              }
            />
            <p className="mt-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
              {hint}
            </p>
          </>
        }
        table={<HeatMapTable caption={vm.title} rows={vm.rows} periods={vm.periods} />}
      />
    </SheetSection>
  );
}
