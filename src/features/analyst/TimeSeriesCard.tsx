"use client";

import { useId, useRef, useState } from "react";

import { LineChart, LineChartTable, SERIES_LEGEND } from "@/components/charts/LineChart";
import { Legend } from "@/components/charts/Legend";
import { TableView, ViewAsTableToggle } from "@/components/charts/ViewAsTable";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext, cellQuestion } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useLanding, useLandingTarget } from "./useLanding";
import { toPeriod } from "@/domain";
import { SheetSection } from "./Sheet";
import type { TimeSeriesVM } from "./viewModel";

export function TimeSeriesCard({ vm, className }: { vm: TimeSeriesVM; className?: string }) {
  const { setContext } = useConsoleContext();
  const { prefill } = useAskWhy();
  const landing = useLanding();
  const ref = useRef<HTMLElement>(null);
  const tableId = useId();
  const [pressed, setPressed] = useState(false);
  const landed = landing.active;

  // The page scrolls here when a citation lands on this chart.
  useLandingTarget(ref);

  return (
    <SheetSection
      eyebrow={vm.title}
      subtitle={vm.subtitle}
      landed={landed}
      sectionRef={ref}
      actions={
        <>
          <Legend items={SERIES_LEGEND} label="Series" />
          <ViewAsTableToggle
            pressed={pressed}
            controls={tableId}
            onPressedChange={setPressed}
            subject={`the ${vm.title} chart`}
          />
        </>
      }
      {...(className ? { className } : {})}
    >
      <TableView
        id={tableId}
        pressed={pressed}
        chart={
          <LineChart
            points={vm.points}
            anomalies={vm.anomalies}
            selectedPeriod={vm.selectedPeriod}
            {...(landed && landing.target ? { landedPeriod: landing.target.period } : {})}
            title={vm.chartTitle}
            desc={vm.desc}
            onPeriod={(period) => setContext({ period: toPeriod(period) })}
            ask={{
              subject: vm.subject.name,
              onAsk: ({ period, momPct }) =>
                prefill(
                  cellQuestion(vm.subject.name, period, momPct),
                  askContext(vm.subject.entity, vm.subject.name, toPeriod(period)),
                  "the anomaly marker",
                ),
            }}
          />
        }
        table={
          <LineChartTable
            caption={vm.chartTitle}
            points={vm.points}
            anomalies={vm.anomalies}
            selectedPeriod={vm.selectedPeriod}
          />
        }
      />
    </SheetSection>
  );
}
