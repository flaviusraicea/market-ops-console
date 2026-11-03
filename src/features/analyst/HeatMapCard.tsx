"use client";

import { HeatMap, HeatMapTable } from "@/components/charts/HeatMap";
import { Legend } from "@/components/charts/Legend";
import { ATTAINMENT_LEGEND } from "@/components/charts/scales";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { PeriodSchema } from "@/domain";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext, cellQuestion } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SheetSection } from "./Sheet";
import type { HeatMapVM } from "./viewModel";

export function HeatMapCard({ vm, className }: { vm: HeatMapVM; className?: string }) {
  const { setContext } = useConsoleContext();
  const { prefill } = useAskWhy();
  return (
    <SheetSection
      eyebrow="Attainment by month"
      subtitle={vm.subtitle}
      caption={vm.caption}
      {...(className ? { className } : {})}
    >
      <ViewAsTable
        subject="the attainment by month heat map"
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
              onCell={(market, period) =>
                setContext({ market, period: PeriodSchema.parse(period) })
              }
              onAsk={({ market, marketName, period, momPct }) =>
                prefill(
                  cellQuestion(marketName, period, momPct),
                  askContext(
                    { kind: "market", marketId: market },
                    marketName,
                    PeriodSchema.parse(period),
                  ),
                  "the heat map cell",
                )
              }
            />
            <p className="mt-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
              {vm.hint}
            </p>
          </>
        }
        table={<HeatMapTable caption={vm.title} rows={vm.rows} periods={vm.periods} />}
      />
    </SheetSection>
  );
}
