"use client";

import { useEffect, useRef } from "react";

import { LineChart, LineChartTable, SERIES_LEGEND } from "@/components/charts/LineChart";
import { Legend } from "@/components/charts/Legend";
import { ViewAsTable } from "@/components/charts/ViewAsTable";
import { prefersReducedMotion } from "@/lib/motion";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useLanding } from "./useLanding";
import type { Period } from "@/domain";
import { AnalystCard } from "./AnalystCard";
import type { TimeSeriesVM } from "./viewModel";

export function TimeSeriesCard({ vm, className }: { vm: TimeSeriesVM; className?: string }) {
  const { setContext } = useConsoleContext();
  const landing = useLanding();
  const ref = useRef<HTMLDivElement>(null);
  const landed = landing.active;

  // Bring the chart into view when a citation lands on it.
  useEffect(() => {
    if (!landed) return;
    ref.current?.scrollIntoView({
      block: "center",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [landed]);

  return (
    <AnalystCard
      title={vm.title}
      caption={vm.caption}
      landed={landed}
      sectionRef={ref}
      {...(className ? { className } : {})}
    >
      <ViewAsTable
        toolbar={<Legend items={SERIES_LEGEND} label="Series" />}
        chart={
          <LineChart
            points={vm.points}
            anomalies={vm.anomalies}
            selectedPeriod={vm.selectedPeriod}
            {...(landed && landing.target ? { landedPeriod: landing.target.period } : {})}
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
