"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { InfoTip } from "@/components/InfoTip";
import { Sparkline } from "@/components/charts/Sparkline";
import { StatusBadge } from "@/components/StatusBadge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AskWhyIconButton } from "@/features/assistant/AskWhyIconButton";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIN_CELL_CLASS, ScrollTable } from "@/components/ui/scroll-table";
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

/** In the grid the button shows on row hover, focus or selection; on touch it always shows. */
const REVEAL =
  "pointer-coarse:opacity-100 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-data-[state=selected]:opacity-100 focus-visible:opacity-100";

/**
 * Fixed column widths: the market name takes what is left, every other column its own fixed
 * width, so nothing is clipped and the row's Ask why stays inside the row. The twelve columns need 1,120 px;
 * a narrower card scrolls the table with the name column pinned and the scrollbar always shown.
 */
const MARKET_COLS = [
  undefined, // Market: what is left, at least 144 px: "United Kingdom" and its code in full
  "120px", // Region: "North America" in full
  "112px", // Status: the 88 px badge and the 12 px cell padding each side
  "80px", // Revenue
  "80px", // Forecast
  "80px", // Prior year
  "96px", // Attainment, with its 20 px note slot
  "96px", // Growth YoY: its header in full
  "72px", // Share
  "80px", // Units: the semibold total "103,868" in full
  "120px", // 24 months: the 96 px sparkline and its padding
  "40px", // Ask why
];
const PRODUCT_COLS = [undefined, "80px", "80px", "80px", "96px", "80px", "72px", "120px"];
/** The fixed columns plus 144 px for the name. */
const minWidth = (cols: ReadonlyArray<string | undefined>) =>
  cols.reduce((sum, w) => sum + (w ? parseInt(w, 10) : 144), 0);

function ColGroup({ cols }: { cols: ReadonlyArray<string | undefined> }) {
  return (
    <colgroup>
      {cols.map((w, i) => (
        <col key={i} {...(w ? { style: { width: w } } : {})} />
      ))}
    </colgroup>
  );
}

const PINNED_HEAD = "bg-surface";
/** The width of the attainment note's ⓘ (InfoTip), kept empty on rows without a note. */
const NOTE_SLOT = "inline-block w-5 shrink-0";

const PINNED_CELL = PIN_CELL_CLASS;

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
      <ColGroup cols={MARKET_COLS} />
      <TableHeader className="bg-transparent">
        <TableRow className="hover:bg-transparent">
          <SortHead
            label="Market"
            column="name"
            firstDir="asc"
            align="left"
            sort={sort}
            onSort={onSort}
            pin="start"
            className={PINNED_HEAD}
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
          <TableHead scope="col" data-pin="end" className={cn(PINNED_HEAD, "px-1")}>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r.id} {...rowProps(false, () => setContext({ market: r.id }))}>
            <TableCell data-pin="start" className={cn(PINNED_CELL, "font-medium text-ink")}>
              {/* The ellipsis clips an inner box, so the pinned cell's fade can reach past the cell. */}
              <span className="block truncate">
                {r.name}{" "}
                <span className="text-[length:var(--text-caption)] font-normal text-ink-muted max-md:hidden">
                  {r.iso2}
                </span>
              </span>
            </TableCell>
            <TableCell className="max-md:px-2">
              {ctx.region === r.regionId ? (
                <span className="block truncate text-ink-2">{r.regionName}</span>
              ) : (
                <button
                  type="button"
                  aria-label={`Drill into ${r.regionName}`}
                  onClick={() => setContext({ region: r.regionId })}
                  className="block max-w-full truncate rounded-control text-ink-2 underline-offset-4 hover:text-ink hover:underline"
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
                {/* Every row, and the total, reserves the note's 20 px slot, so the numbers share one right edge (A3). */}
                {r.attainmentNote ? (
                  <InfoTip label={`Status note for ${r.name}`}>{r.attainmentNote}</InfoTip>
                ) : (
                  <span aria-hidden className={NOTE_SLOT} />
                )}
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
            {/* 4 px each side: the 32 px button fills its 40 px column. */}
            <TableCell data-pin="end" className={cn(PINNED_CELL, "px-1 text-right")}>
              <AskWhyIconButton
                className={REVEAL}
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
      <TotalRow total={total} labelSpan={3} share trailing={1} pinEnd noteSlot />
    </>
  );
}

/** The ledger's bottom rule: the entity in view, summed or derived from the same facts as the rows. */
function TotalRow({
  total,
  labelSpan,
  share = false,
  trailing,
  pinEnd = false,
  noteSlot = false,
}: {
  total: GridTotalVM;
  labelSpan: number;
  share?: boolean;
  trailing: number;
  /** The table pins its last column, so the footer keeps a pinned cell there too. */
  pinEnd?: boolean;
  /** The rows above reserve the attainment note's slot, so the total does too. */
  noteSlot?: boolean;
}) {
  return (
    <TableFooter>
      <TableRow className="hover:bg-transparent">
        {/* The label pins with the first column alone, so its edge lines up with the rows above. */}
        <TableCell data-pin="start" className="bg-surface-2 font-semibold text-ink">
          <span className="block truncate">{total.label}</span>
        </TableCell>
        {labelSpan > 1 ? <TableCell colSpan={labelSpan - 1} /> : null}
        <TableCell className="text-right num">{total.revenue}</TableCell>
        <TableCell className="text-right num">{total.forecast}</TableCell>
        <TableCell className="text-right num">{total.priorYear}</TableCell>
        <TableCell className="text-right num">
          {noteSlot ? (
            <span className="inline-flex items-center justify-end gap-0.5">
              {total.attainment}
              <span aria-hidden className={NOTE_SLOT} />
            </span>
          ) : (
            <AttainmentSlot
              figure={total.attainment}
              note={
                total.attainmentNote ? (
                  <InfoTip label={`Differs from source: ${total.label} attainment`} tone="warn">
                    {`Differs from source: ${total.attainmentNote}`}
                  </InfoTip>
                ) : null
              }
            />
          )}
        </TableCell>
        <TableCell className={cn("text-right num", signColour(total.growthDirection))}>
          {total.growth}
        </TableCell>
        {share ? <TableCell /> : null}
        <TableCell className="text-right num">{total.units}</TableCell>
        <TableCell colSpan={trailing} />
        {pinEnd ? <TableCell data-pin="end" className="bg-surface-2" /> : null}
      </TableRow>
    </TableFooter>
  );
}

/** The figure plus a fixed 16 px trailing slot, so a row with a note and a row without keep their decimals aligned. */
function AttainmentSlot({ figure, note }: { figure: string; note?: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-end gap-0.5">
      {figure}
      <span className="inline-flex size-4 items-center justify-center [&>*]:shrink-0">{note}</span>
    </span>
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
  const { ctx, setContext } = useConsoleContext();
  const sorted = useMemo(() => sortRows(rows, sort), [rows, sort]);
  return (
    <>
      <ColGroup cols={PRODUCT_COLS} />
      <TableHeader className="bg-transparent">
        <TableRow className="hover:bg-transparent">
          <SortHead
            label="Product"
            column="name"
            firstDir="asc"
            align="left"
            sort={sort}
            onSort={onSort}
            pin="start"
            className={PINNED_HEAD}
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
        {sorted.map((r) => {
          // The selection moves on the click; the server's row model follows.
          const selected = ctx.product === r.id;
          return (
            <TableRow
              key={r.id}
              {...rowProps(selected, () => setContext({ product: r.id }), landed && selected)}
            >
              <TableCell data-pin="start" className={cn(PINNED_CELL, "font-medium text-ink")}>
                {r.name}
              </TableCell>
              <TableCell className="text-right num">{r.revenue}</TableCell>
              <TableCell className="text-right num">{r.forecast}</TableCell>
              <TableCell className="text-right num">{r.priorYear}</TableCell>
              <TableCell className="text-right num">
                <AttainmentSlot figure={r.attainment} />
              </TableCell>
              <TableCell className={cn("text-right num", signColour(r.growthDirection))}>
                {r.growth}
              </TableCell>
              <TableCell className="text-right num">{r.units}</TableCell>
              <TableCell>
                <Sparkline values={r.trend.values} label={r.trend.label} />
              </TableCell>
            </TableRow>
          );
        })}
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
      <ScrollTable
        scrollLabel={`${grid.title}, scrollable`}
        className="table-fixed"
        style={{ minWidth: minWidth(grid.kind === "markets" ? MARKET_COLS : PRODUCT_COLS) }}
      >
        <TableCaption className="sr-only">
          {grid.title}. {subtitle}. {grid.caption}
        </TableCaption>
        {grid.kind === "markets" ? (
          <TooltipProvider>
            <MarketRows rows={grid.rows} total={grid.total} sort={sort} onSort={setSort} />
          </TooltipProvider>
        ) : (
          <ProductRows
            rows={grid.rows}
            total={grid.total}
            landed={productLanding}
            sort={sort}
            onSort={setSort}
          />
        )}
      </ScrollTable>
    </SheetSection>
  );
}
