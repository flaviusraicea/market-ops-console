"use client";

import { useId, useState } from "react";

import { HeatMap, HeatMapTable } from "@/components/charts/HeatMap";
import { Legend } from "@/components/charts/Legend";
import { ATTAINMENT_LEGEND } from "@/components/charts/scales";
import { TableView, ViewAsTableToggle } from "@/components/charts/ViewAsTable";
import { toPeriod } from "@/domain";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext, cellQuestion } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SheetSection } from "./Sheet";
import type { HeatMapVM } from "./viewModel";

export function HeatMapCard({ vm, className }: { vm: HeatMapVM; className?: string }) {
  const { setContext } = useConsoleContext();
  const { prefill } = useAskWhy();
  const tableId = useId();
  const [pressed, setPressed] = useState(false);
  return (
    <SheetSection
      eyebrow="Attainment by month"
      subtitle={vm.subtitle}
      caption={vm.caption}
      allProducts={vm.allProducts}
      actions={
        <ViewAsTableToggle
          pressed={pressed}
          controls={tableId}
          onPressedChange={setPressed}
          subject="the attainment by month heat map"
        />
      }
      {...(className ? { className } : {})}
    >
      <div className="flex flex-col gap-3">
        <TableView
          id={tableId}
          pressed={pressed}
          chart={
            <>
              <HeatMap
                rows={vm.rows}
                periods={vm.periods}
                selected={vm.selected}
                label={vm.title}
                onCell={(market, period) => setContext({ market, period: toPeriod(period) })}
                onAsk={({ market, marketName, period, momPct }) =>
                  prefill(
                    cellQuestion(marketName, period, momPct),
                    askContext({ kind: "market", marketId: market }, marketName, toPeriod(period)),
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
        {pressed ? null : (
          <Legend
            label="Attainment colour scale"
            items={ATTAINMENT_LEGEND.map((b) => ({
              label: b.label,
              swatch: "fill",
              color: b.token,
            }))}
          />
        )}
      </div>
    </SheetSection>
  );
}
