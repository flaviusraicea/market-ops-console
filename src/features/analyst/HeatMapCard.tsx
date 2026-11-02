"use client";

import { HeatMap, HeatMapTable } from "@/components/charts/HeatMap";
import { Legend } from "@/components/charts/Legend";
import { ATTAINMENT_LEGEND } from "@/components/charts/scales";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import type { Period } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { AnalystCard } from "./AnalystCard";
import type { HeatMapVM } from "./viewModel";

export function HeatMapCard({ vm, className }: { vm: HeatMapVM; className?: string }) {
  const { setContext } = useConsoleContext();
  return (
    <AnalystCard title={vm.title} caption={vm.caption} {...(className ? { className } : {})}>
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
          <HeatMap
            rows={vm.rows}
            periods={vm.periods}
            selected={vm.selected}
            label={vm.title}
            onCell={(market, period) => setContext({ market, period: period as Period })}
          />
        }
        table={<HeatMapTable caption={vm.title} rows={vm.rows} periods={vm.periods} />}
      />
    </AnalystCard>
  );
}
