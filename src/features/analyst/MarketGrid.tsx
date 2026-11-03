"use client";

import type { KeyboardEvent } from "react";

import { cn } from "@/components/cn";
import { ArrowDown, ICON_STROKE, Info, MessageSquareText } from "@/components/icons";
import { Sparkline } from "@/components/charts/Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAskWhy } from "@/features/assistant/askWhy";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useLanding } from "./useLanding";
import { AnalystCard } from "./AnalystCard";
import type { GridVM, MarketRowVM, ProductRowVM } from "./viewModel";

const DOT: Record<string, string> = {
  on_track: "bg-ok-mark",
  at_risk: "bg-warn-mark",
  off_track: "bg-bad-mark",
};

const signColour = (d: "up" | "down" | "flat") =>
  d === "up" ? "text-ok-text" : d === "down" ? "text-bad-text" : "text-ink-2";

function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex size-5 items-center justify-center rounded-control text-ink-muted hover:text-ink"
        >
          <Info aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">{children}</TooltipContent>
    </Tooltip>
  );
}

/** A focusable row that selects on Enter or Space, unless the key came from a control inside it. */
function rowProps(selected: boolean, onSelect: () => void, landed = false) {
  return {
    "data-landed": landed ? "" : undefined,
    tabIndex: 0,
    "aria-current": selected ? ("true" as const) : undefined,
    "data-state": selected ? "selected" : undefined,
    className: "cursor-pointer",
    onClick: (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      onSelect();
    },
    onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect();
      }
    },
  };
}

function MarketRows({ rows, statusRule }: { rows: MarketRowVM[]; statusRule: string }) {
  const { setContext } = useConsoleContext();
  const { prefill } = useAskWhy();
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Market</TableHead>
          <TableHead scope="col">
            <span className="inline-flex items-center gap-0.5">
              Status
              <InfoTip label="How status is determined">{statusRule}</InfoTip>
            </span>
          </TableHead>
          <TableHead scope="col" aria-sort="descending" className="text-right">
            <span className="inline-flex items-center gap-1">
              <ArrowDown aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
              Revenue
              <span className="sr-only">, sorted largest first</span>
            </span>
          </TableHead>
          <TableHead scope="col" className="text-right">
            Attainment
          </TableHead>
          <TableHead scope="col" className="text-right">
            Growth YoY
          </TableHead>
          <TableHead scope="col" className="text-right">
            Share
          </TableHead>
          <TableHead scope="col">Trend</TableHead>
          <TableHead scope="col">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} {...rowProps(false, () => setContext({ market: r.id }))}>
            <TableCell>
              <span className="font-medium text-ink">{r.name}</span>{" "}
              <span className="text-[length:var(--text-caption)] text-ink-muted">{r.iso2}</span>
            </TableCell>
            <TableCell>
              <Badge variant={r.status}>
                <span aria-hidden className={cn("size-2 rounded-pill", DOT[r.status])} />
                {r.statusLabel}
              </Badge>
            </TableCell>
            <TableCell className="text-right num">{r.revenue}</TableCell>
            <TableCell className="text-right num">
              <span className="inline-flex items-center justify-end gap-0.5">
                {r.attainment}
                {r.attainmentNote ? (
                  <InfoTip label={`Status note for ${r.name}`}>{r.attainmentNote}</InfoTip>
                ) : null}
              </span>
            </TableCell>
            <TableCell className={cn("text-right num", signColour(r.growthDirection))}>
              {r.growth}
            </TableCell>
            <TableCell className="text-right num">{r.share}</TableCell>
            <TableCell>
              <Sparkline
                values={r.trend.values}
                anomalyIndex={r.trend.anomalyIndex}
                label={r.trend.label}
              />
            </TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={r.askWhy.aria}
                onClick={() => prefill(r.askWhy.text)}
              >
                <MessageSquareText aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

function ProductRows({ rows, landed }: { rows: ProductRowVM[]; landed: boolean }) {
  const { setContext } = useConsoleContext();
  return (
    <>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Product</TableHead>
          <TableHead scope="col" aria-sort="descending" className="text-right">
            <span className="inline-flex items-center gap-1">
              <ArrowDown aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
              Revenue
              <span className="sr-only">, sorted largest first</span>
            </span>
          </TableHead>
          <TableHead scope="col" className="text-right">
            Attainment
          </TableHead>
          <TableHead scope="col" className="text-right">
            Growth YoY
          </TableHead>
          <TableHead scope="col" className="text-right">
            Units
          </TableHead>
          <TableHead scope="col">Trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow
            key={r.id}
            {...rowProps(r.selected, () => setContext({ product: r.id }), landed && r.selected)}
          >
            <TableCell className="font-medium text-ink">{r.name}</TableCell>
            <TableCell className="text-right num">{r.revenue}</TableCell>
            <TableCell className="text-right num">{r.attainment}</TableCell>
            <TableCell className={cn("text-right num", signColour(r.growthDirection))}>
              {r.growth}
            </TableCell>
            <TableCell className="text-right num">{r.units}</TableCell>
            <TableCell>
              <Sparkline values={r.trend.values} label={r.trend.label} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
}

/** Design-system 6.4. A plain table (no grid role): rows are focusable and select on Enter or Space. */
export function MarketGrid({ grid }: { grid: GridVM }) {
  const landing = useLanding();
  const kind = landing.target?.entity.kind;
  // A product citation rings the selected product row; any other kind rings the card (market, region).
  const productLanding = landing.active && kind === "product";
  return (
    <AnalystCard
      title={grid.title}
      caption={grid.caption}
      landed={landing.active && kind !== "product" && kind !== "portfolio"}
    >
      <TooltipProvider>
        <Table scrollLabel={`${grid.title}, scrollable`}>
          <TableCaption className="sr-only">
            {grid.title}. {grid.caption}
          </TableCaption>
          {grid.kind === "markets" ? (
            <MarketRows rows={grid.rows} statusRule={grid.statusRule} />
          ) : (
            <ProductRows rows={grid.rows} landed={productLanding} />
          )}
        </Table>
      </TooltipProvider>
    </AnalystCard>
  );
}
