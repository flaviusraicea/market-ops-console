"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";

import { ICON_STROKE, TableIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type ToggleProps = {
  pressed: boolean;
  controls: string;
  onPressedChange: (next: boolean) => void;
  /** What the table is of, e.g. "the markets map". Part of the accessible name only, so several toggles on a page differ (WCAG 2.4.6). */
  subject: string;
  /** Replaces "View as chart" while the table shows, when the table is the default view (the map on a phone). */
  chartLabel?: string;
};

/** Ghost toggle (design-system 6.10). The label swaps to "View as chart" while the table is shown. */
export function ViewAsTableToggle({
  pressed,
  controls,
  onPressedChange,
  subject,
  chartLabel,
}: ToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={pressed}
      aria-controls={controls}
      onClick={() => onPressedChange(!pressed)}
    >
      <TableIcon aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
      {pressed && chartLabel ? chartLabel : pressed ? "View as chart" : "View as table"}
      {pressed && chartLabel ? null : <span className="sr-only"> of {subject}</span>}
    </Button>
  );
}

/**
 * For a chart that is a table first on a phone: the person's choice, or none yet. With none, CSS picks the view
 * (the table under 768 px, the chart above), so the server's markup is right on both and nothing jumps after
 * hydration. `pressed` is what the toggle reports.
 */
export function useTableFirstOnPhone() {
  const phone = useMediaQuery(PHONE_QUERY);
  const [choice, setChoice] = useState<"chart" | "table" | null>(null);
  const pressed = choice === null ? phone : choice === "table";
  return {
    pressed,
    /** True while the person has not chosen, so the view follows the width. */
    auto: choice === null,
    /** Spread onto the toggle: on a phone the chart view is called "View map", elsewhere the default label stays. */
    viewMap: phone ? { chartLabel: "View map" } : {},
    toggle: (next: boolean) => setChoice(next ? "table" : "chart"),
  };
}

/** Renders the table and hides the chart while pressed. With `auto`, the table shows under 768 px and the chart above. */
export function TableView({
  id,
  pressed,
  chart,
  table,
  auto = false,
}: {
  id: string;
  pressed: boolean;
  chart: ReactNode;
  table: ReactNode;
  auto?: boolean;
}) {
  return (
    <>
      <div hidden={auto ? undefined : pressed} className={cn(auto && "max-md:hidden")}>
        {chart}
      </div>
      <div id={id} hidden={auto ? undefined : !pressed} className={cn(auto && "md:hidden")}>
        {table}
      </div>
    </>
  );
}

/**
 * Toolbar plus switchable chart and table. State is local. With `forced`, the chart is skipped and
 * the table is the only view (for example when the map geometry failed to load).
 */
export function ViewAsTable({
  toolbar,
  chart,
  table,
  subject,
  footer,
  forced = false,
}: {
  toolbar?: ReactNode;
  /** Under the chart (a legend); not shown with the table. */
  footer?: ReactNode;
  subject: string;
  chart: ReactNode;
  table: ReactNode;
  forced?: boolean;
}) {
  const tableId = useId();
  const [pressed, setPressed] = useState(false);
  const showTable = forced || pressed;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">{toolbar}</div>
        {forced ? null : (
          <ViewAsTableToggle
            pressed={pressed}
            controls={tableId}
            onPressedChange={setPressed}
            subject={subject}
          />
        )}
      </div>
      <TableView id={tableId} pressed={showTable} chart={forced ? null : chart} table={table} />
      {footer && !showTable ? footer : null}
    </div>
  );
}
