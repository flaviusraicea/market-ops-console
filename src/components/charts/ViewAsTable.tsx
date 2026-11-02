"use client";

import { useId, useState, type ReactNode } from "react";

import { ICON_STROKE, TableIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type ToggleProps = { pressed: boolean; controls: string; onPressedChange: (next: boolean) => void };

/** Ghost toggle (design-system 6.10). The label swaps to "View as chart" while the table is shown. */
export function ViewAsTableToggle({ pressed, controls, onPressedChange }: ToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-pressed={pressed}
      aria-controls={controls}
      onClick={() => onPressedChange(!pressed)}
    >
      <TableIcon aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
      {pressed ? "View as chart" : "View as table"}
    </Button>
  );
}

/** Renders the table and hides the chart (hidden attribute) while pressed. */
export function TableView({
  id,
  pressed,
  chart,
  table,
}: {
  id: string;
  pressed: boolean;
  chart: ReactNode;
  table: ReactNode;
}) {
  return (
    <>
      <div hidden={pressed}>{chart}</div>
      <div id={id} hidden={!pressed}>
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
  forced = false,
}: {
  toolbar?: ReactNode;
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
          <ViewAsTableToggle pressed={pressed} controls={tableId} onPressedChange={setPressed} />
        )}
      </div>
      <TableView id={tableId} pressed={showTable} chart={forced ? null : chart} table={table} />
    </div>
  );
}
