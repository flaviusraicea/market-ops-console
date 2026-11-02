"use client";

import { RadarChart, RadarChartTable } from "@/components/charts/RadarChart";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { AnalystCard } from "./AnalystCard";
import type { RadarVM } from "./viewModel";

export function RadarCard({ vm, rowLabel }: { vm: RadarVM; rowLabel: string }) {
  const desc = `Radar chart of ${vm.series.length} ${rowLabel.toLowerCase()}s on ${vm.axes.join(", ")}. Each axis is scaled from the lowest to the highest value shown. Table available via View as table.`;
  return (
    <AnalystCard title={vm.title} caption={vm.caption}>
      <ViewAsTable
        chart={<RadarChart axes={vm.axes} series={vm.series} title={vm.title} desc={desc} />}
        table={
          <RadarChartTable
            caption={vm.title}
            rowLabel={rowLabel}
            axes={vm.axes}
            series={vm.series}
          />
        }
      />
    </AnalystCard>
  );
}
