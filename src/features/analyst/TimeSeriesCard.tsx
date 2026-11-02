"use client";

import { LineChart, LineChartTable, SERIES_LEGEND } from "@/components/charts/LineChart";
import { Legend } from "@/components/charts/Legend";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { Period } from "@/domain";
import { AnalystCard } from "./AnalystCard";
import type { TimeSeriesVM } from "./viewModel";

export function TimeSeriesCard({ vm, className }: { vm: TimeSeriesVM; className?: string }) {
  const { setContext } = useConsoleContext();
  return (
    <AnalystCard title={vm.title} caption={vm.caption} {...(className ? { className } : {})}>
      <ViewAsTable
        toolbar={<Legend items={SERIES_LEGEND} label="Series" />}
        chart={
          <LineChart
            points={vm.points}
            anomalies={vm.anomalies}
            selectedPeriod={vm.selectedPeriod}
            title={vm.title}
            desc={vm.desc}
            onPeriod={(period) => setContext({ period: period as Period })}
          />
        }
        table={<LineChartTable caption={vm.title} points={vm.points} anomalies={vm.anomalies} />}
      />
    </AnalystCard>
  );
}
