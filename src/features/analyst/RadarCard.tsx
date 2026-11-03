"use client";

import { RadarChart, RadarChartTable } from "@/components/charts/RadarChart";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { SheetSection } from "./Sheet";
import type { RadarVM } from "./viewModel";

export function RadarCard({ vm, rowLabel }: { vm: RadarVM; rowLabel: string }) {
  const desc = `Radar chart of ${vm.series.length} ${rowLabel.toLowerCase()}s on ${vm.axes.join(", ")}. Each axis is scaled from the lowest to the highest value shown. Table available via View as table.`;
  return (
    <SheetSection eyebrow="Compare" subtitle={vm.subtitle} caption={vm.caption}>
      <ViewAsTable
        subject="the compare radar chart"
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
    </SheetSection>
  );
}
