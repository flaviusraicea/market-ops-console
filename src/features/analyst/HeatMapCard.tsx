"use client";

import { useId, useState, type CSSProperties } from "react";

import { HEAT_PLOT_INSET, HeatMap, HeatMapTable } from "@/components/charts/HeatMap";
import { Legend } from "@/components/charts/Legend";
import { ATTAINMENT_LEGEND } from "@/components/charts/scales";
import { TableView, ViewAsTableToggle } from "@/components/charts/ViewAsTable";
import { ICON_STROKE, TriangleAlert } from "@/components/icons";
import { toPeriod } from "@/domain";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext, cellQuestion } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SheetSection } from "./Sheet";
import type { HeatMapVM } from "./viewModel";

export function HeatMapCard({ vm, className }: { vm: HeatMapVM; className?: string }) {
  const { ctx, setContext } = useConsoleContext();
  // The outline moves on the click; the server's model follows.
  const selected = ctx.market ? { market: ctx.market, period: ctx.period } : vm.selected;
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
      {/* Centred in the height the radar beside it sets, so a region with few markets has no empty band under the
          cells. The cells keep their height: a taller cell would read as a different value. */}
      <div className="my-auto flex flex-col gap-3">
        <TableView
          id={tableId}
          pressed={pressed}
          chart={
            <>
              <HeatMap
                rows={vm.rows}
                periods={vm.periods}
                selected={selected}
                label={vm.title}
                differsNote={vm.differsNote}
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
          // The scale starts at the plot's first month column, past the market names.
          <div
            className="md:pl-[var(--heat-inset)]"
            // CSSProperties has no index for custom properties
            style={{ "--heat-inset": HEAT_PLOT_INSET } as CSSProperties}
          >
            <Legend
              label="Attainment colour scale"
              items={ATTAINMENT_LEGEND.map((b) => ({
                label: b.label,
                swatch: "fill",
                color: b.token,
              }))}
            />
          </div>
        )}
        {vm.differsNote ? (
          <p className="flex items-center gap-1.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
            <TriangleAlert
              aria-hidden
              className="size-3 shrink-0 text-warn-mark"
              strokeWidth={ICON_STROKE}
            />
            <span>beside a month: differs from source</span>
          </p>
        ) : null}
      </div>
    </SheetSection>
  );
}
