"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { InfoTip } from "@/components/InfoTip";
import { ICON_STROKE, Sparkles } from "@/components/icons";
import { Sparkline } from "@/components/charts/Sparkline";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAskWhy } from "@/features/assistant/askWhy";
import { askContext } from "@/features/assistant/questions";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SortHead } from "./SortHead";
import { useLanding } from "./useLanding";
import { SheetSection } from "./Sheet";
import type {
  GridTotalVM,
  GridVM,
  MarketRowVM,
  ProductRowVM,
  SortKey,
  SortValues,
} from "./viewModel";

const SORT_LABEL: Record<SortKey, string> = {
  name: "name",
  revenue: "revenue",
  forecast: "forecast",
  priorYear: "prior year",
  attainment: "attainment",
  growth: "growth",
  share: "share",
  units: "units",
};

type Sort = { key: SortKey; dir: "asc" | "desc" };
const DEFAULT_SORT: Sort = { key: "revenue", dir: "desc" };

const signColour = (d: "up" | "down" | "flat") =>
  d === "up" ? "text-ok-text" : d === "down" ? "text-bad-text" : "text-ink-2";

/** A focusable row that selects on Enter or Space, unless the key came from a control inside it. */
function rowProps(selected: boolean, onSelect: () => void, landed = false) {
  return {
    "data-landing-target": "",
    "data-landed": landed ? "" : undefined,
    tabIndex: 0,
    "aria-current": selected ? ("true" as const) : undefined,
    "data-state": selected ? "selected" : undefined,
    className: "group cursor-pointer",
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

/** Sorts a copy of the rows; ties fall back to revenue so the order never shuffles. */
function sortRows<T extends { name: string; sort: SortValues }>(rows: T[], sort: Sort): T[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  const value = (r: T, key: SortKey) => (key === "name" ? 0 : (r.sort[key] ?? 0));
  return [...rows].sort((a, b) => {
    if (sort.key === "name") return sign * a.name.localeCompare(b.name);
    const diff = value(a, sort.key) - value(b, sort.key);
    return diff !== 0 ? sign * diff : value(b, "revenue") - value(a, "revenue");
  });
}

function AskWhyButton({ label, onAsk }: { label: string; onAsk: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      onClick={onAsk}
      className="pointer-coarse:opacity-100 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-data-[state=selected]:opacity-100 focus-visible:opacity-100"
    >
      <Sparkles aria-hidden className="size-3.5 text-ai-label" strokeWidth={ICON_STROKE} />
      Ask why
    </Button>
  );
}

const STICKY_HEAD = "sticky left-0 z-[1] bg-surface";

/** The sticky first cell keeps the row's own tint so scrolled columns slide under it. */
const STICKY_CELL =
  "sticky left-0 z-[1] bg-surface group-hover:bg-surface-2 group-data-[state=selected]:bg-accent-soft";

function MarketRows({
  rows,
  total,
  sort,
  onSort,
}: {
  rows: MarketRowVM[];
  total: GridTotalVM;
  sort: Sort;
  onSort: (next: Sort) => void;
}) {
  const { ctx, setContext } = useConsoleContext();
  const { ask } = useAskWhy();
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  return (
    <>
      <TableHeader className="bg-transparent">
        <TableRow className="hover:bg-transparent">
          <SortHead
            label="Market"
            column="name"
            firstDir="asc"
            align="left"
            sort={sort}
            onSort={onSort}
            className={STICKY_HEAD}
          />
          <TableHead scope="col">Region</TableHead>
          <TableHead scope="col">Status</TableHead>
          <SortHead label="Revenue" column="revenue" sort={sort} onSort={onSort} />
          <SortHead label="Forecast" column="forecast" sort={sort} onSort={onSort} />
          <SortHead label="Prior year" column="priorYear" sort={sort} onSort={onSort} />
          <SortHead label="Attainment" column="attainment" sort={sort} onSort={onSort} />
          <SortHead label="Growth YoY" column="growth" sort={sort} onSort={onSort} />
          <SortHead label="Share" column="share" sort={sort} onSort={onSort} />
          <SortHead label="Units" column="units" sort={sort} onSort={onSort} />
          <TableHead scope="col">24 months</TableHead>
          <TableHead scope="col">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id} {...rowProps(false, () => setContext({ market: r.id }))}>
            <TableCell className={cn(STICKY_CELL, "font-medium text-ink")}>
              {r.name}{" "}
              <span className="text-[length:var(--text-caption)] font-normal text-ink-muted max-md:hidden">
                {r.iso2}
              </span>
            </TableCell>
            <TableCell className="max-md:px-2">
              {ctx.region === r.regionId ? (
                <span className="text-ink-2">{r.regionName}</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Drill into ${r.regionName}`}
                  onClick={() => setContext({ region: r.regionId })}
                  className="rounded-control text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                >
                  {r.regionName}
                </button>
              )}
            </TableCell>
            <TableCell className="max-md:px-2">
              <StatusBadge status={r.status} label={r.statusLabel} size="sm" />
            </TableCell>
            <TableCell className="text-right num">{r.revenue}</TableCell>
            <TableCell className="text-right num">{r.forecast}</TableCell>
            <TableCell className="text-right num">{r.priorYear}</TableCell>
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
            <TableCell className="text-right num">{r.units}</TableCell>
            <TableCell>
              <Sparkline
                values={r.trend.values}
                anomalyIndex={r.trend.anomalyIndex}
                label={r.trend.label}
              />
            </TableCell>
            <TableCell className="text-right">
              <AskWhyButton
                label={r.askWhy.aria}
                onAsk={() =>
                  ask(
                    r.askWhy.text,
                    askContext({ kind: "market", marketId: r.id }, r.name, ctx.period),
                  )
                }
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TotalRow total={total} labelSpan={3} share trailing={2} />
    </>
  );
}

/** The ledger's bottom rule: the entity in view, summed or derived from the same facts as the rows. */
function TotalRow({
  total,
  labelSpan,
  share = false,
  trailing,
}: {
  total: GridTotalVM;
  labelSpan: number;
  share?: boolean;
  trailing: number;
}) {
  return (
    <TableFooter>
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={labelSpan} className="font-semibold text-ink">
          {total.label}
        </TableCell>
        <TableCell className="text-right num">{total.revenue}</TableCell>
        <TableCell className="text-right num">{total.forecast}</TableCell>
        <TableCell className="text-right num">{total.priorYear}</TableCell>
        <TableCell className="text-right num">{total.attainment}</TableCell>
        <TableCell className={cn("text-right num", signColour(total.growthDirection))}>
          {total.growth}
        </TableCell>
        {share ? <TableCell /> : null}
        <TableCell className="text-right num">{total.units}</TableCell>
        <TableCell colSpan={trailing} />
      </TableRow>
    </TableFooter>
  );
}

function ProductRows({
  rows,
  total,
  landed,
  sort,
  onSort,
}: {
  rows: ProductRowVM[];
  total: GridTotalVM;
  landed: boolean;
  sort: Sort;
  onSort: (next: Sort) => void;
}) {
  const { setContext } = useConsoleContext();
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  return (
    <>
      <TableHeader className="bg-transparent">
        <TableRow className="hover:bg-transparent">
          <SortHead
            label="Product"
            column="name"
            firstDir="asc"
            align="left"
            sort={sort}
            onSort={onSort}
            className={STICKY_HEAD}
          />
          <SortHead label="Revenue" column="revenue" sort={sort} onSort={onSort} />
          <SortHead label="Forecast" column="forecast" sort={sort} onSort={onSort} />
          <SortHead label="Prior year" column="priorYear" sort={sort} onSort={onSort} />
          <SortHead label="Attainment" column="attainment" sort={sort} onSort={onSort} />
          <SortHead label="Growth YoY" column="growth" sort={sort} onSort={onSort} />
          <SortHead label="Units" column="units" sort={sort} onSort={onSort} />
          <TableHead scope="col">24 months</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow
            key={r.id}
            {...rowProps(r.selected, () => setContext({ product: r.id }), landed && r.selected)}
          >
            <TableCell className={cn(STICKY_CELL, "font-medium text-ink")}>{r.name}</TableCell>
            <TableCell className="text-right num">{r.revenue}</TableCell>
            <TableCell className="text-right num">{r.forecast}</TableCell>
            <TableCell className="text-right num">{r.priorYear}</TableCell>
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
      <TotalRow total={total} labelSpan={1} trailing={1} />
    </>
  );
}

/** Design-system 6.4. A plain table (no grid role): rows are focusable and select on Enter or Space. */
export function MarketGrid({ grid }: { grid: GridVM }): ReactNode {
  // Product rows have no share column, so a sort chosen on markets must not carry over (and back).
  return <MarketGridBody key={grid.kind} grid={grid} />;
}

function MarketGridBody({ grid }: { grid: GridVM }): ReactNode {
  const landing = useLanding();
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const kind = landing.target?.entity.kind;
  // A product citation rings the selected product row; any other kind rings the section (market, region).
  const productLanding = landing.active && kind === "product";
  const subtitle = [grid.summary, `Sorted by ${SORT_LABEL[sort.key]}`, grid.note]
    .filter(Boolean)
    .join(" · ");
  return (
    <SheetSection
      eyebrow={grid.title}
      pageHeading
      subtitle={subtitle}
      caption={grid.caption}
      landed={landing.active && kind !== "product" && kind !== "portfolio"}
    >
      <Table scrollLabel={`${grid.title}, scrollable`}>
        <TableCaption className="sr-only">
          {grid.title}. {subtitle}. {grid.caption}
        </TableCaption>
        {grid.kind === "markets" ? (
          <MarketRows rows={grid.rows} total={grid.total} sort={sort} onSort={setSort} />
        ) : (
          <ProductRows
            rows={grid.rows}
            total={grid.total}
            landed={productLanding}
            sort={sort}
            onSort={setSort}
          />
        )}
      </Table>
    </SheetSection>
  );
}
