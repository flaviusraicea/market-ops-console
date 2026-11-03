"use client";

import { Legend } from "@/components/charts/Legend";
import { RadarChart, RadarChartTable } from "@/components/charts/RadarChart";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { SheetSection } from "./Sheet";
import type { RadarVM } from "./viewModel";

export function RadarCard({ vm, rowLabel }: { vm: RadarVM; rowLabel: string }) {
  const desc = `Radar chart of ${vm.series.length} ${rowLabel.toLowerCase()}s on ${vm.axes.join(", ")}. Each axis is scaled from the lowest to the highest value shown. Table available via View as table.`;
  return (
    <SheetSection
      eyebrow="Compare"
      subtitle={vm.subtitle}
      caption={vm.caption}
      allProducts={vm.allProducts}
      legend={
        <Legend
          label="Radar series"
          items={vm.series.map((s) => ({ label: s.name, swatch: "line-solid", color: s.color }))}
        />
      }
    >
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
