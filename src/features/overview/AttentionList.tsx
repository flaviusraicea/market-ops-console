"use client";

import { cn } from "@/components/cn";
import { CardCaption, CardHeader } from "@/components/CardHeader";
import { ArrowDownRight, ArrowUpRight, ICON_STROKE, Sparkles } from "@/components/icons";
import { EYEBROW_CLASS, Eyebrow } from "@/components/Eyebrow";
import { StatusBadge } from "@/components/StatusBadge";
import { Sparkline } from "@/components/charts/Sparkline";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AskWhyIconButton } from "@/features/assistant/AskWhyIconButton";
import { useAskWhy, type AskContext } from "@/features/assistant/askWhy";
import { askContext } from "@/features/assistant/questions";
import type { Status } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useNarrowerThan } from "@/lib/useNarrowerThan";
import type { AttentionRowVM, AttentionVM, ProductRowVM, RankedRowVM } from "./viewModel";

const SPARK_COLOR: Record<Status, string> = {
  off_track: "var(--bad-mark)",
  at_risk: "var(--warn-mark)",
  on_track: "var(--ok-mark)",
};

const HEAD = cn("px-3 py-2 text-left align-middle text-ink-muted uppercase", EYEBROW_CLASS);
const CELL = "num px-3 align-middle whitespace-nowrap";
const ROW = "h-[var(--row-h)] border-b border-grid last:border-b-0";

/**
 * Under 768 px each row becomes two lines: rank, market and status above; attainment, growth and the trend
 * below, with Ask why at the right. Explicit roles keep the table semantics when `display` changes.
 */
const MOBILE_ROW =
  "max-md:grid max-md:h-auto max-md:min-h-[var(--row-h)] max-md:grid-cols-[1.5rem_auto_auto_minmax(0,1fr)] max-md:items-center max-md:gap-x-3 max-md:py-2 max-md:[grid-template-areas:'rank_market_status_ask'_'rank_attain_yoy_spark']";

type Props = {
  attention: AttentionVM;
  /** Replaces the default, which drills into the market through the URL. */
  onSelect?: (marketId: string) => void;
  /** Replaces the default, which puts the question in the assistant and sends it. */
  onAsk?: (text: string, ctx: AskContext) => void;
};

function Growth({ pct, children, rising }: { pct: number; children: string; rising?: boolean }) {
  return (
    <span className={cn(pct < 0 ? "text-bad-text" : rising ? "text-ok-text" : "text-ink")}>
      {children}
    </span>
  );
}

function MarketRow({
  row,
  select,
  ask,
  compact,
}: {
  row: RankedRowVM;
  select: (id: string) => void;
  ask: (text: string, ctx: AskContext) => void;
  /** The card is under 40 rem: Ask why shows its icon only, and the tooltip carries the words. */
  compact: boolean;
}) {
  const { ctx } = useConsoleContext();
  return (
    <tr role="row" className={cn(ROW, MOBILE_ROW)}>
      <td
        role="cell"
        className={cn(CELL, "font-display text-ink-muted max-md:p-0 max-md:[grid-area:rank]")}
      >
        {row.rank}
      </td>
      <MarketCell row={row} select={select} />
      <td role="cell" className={cn(CELL, "max-md:p-0 max-md:[grid-area:status]")}>
        <StatusBadge status={row.status} label={row.statusLabel} size="md" />
      </td>
      <MetricCells row={row} />
      <td
        role="cell"
        className={cn(CELL, "text-right max-md:justify-self-end max-md:p-0 max-md:[grid-area:ask]")}
      >
        <AskWhy
          aria={row.askWhy.aria}
          compact={compact}
          onAsk={() =>
            ask(
              row.askWhy.text,
              askContext({ kind: "market", marketId: row.id }, row.name, ctx.period),
            )
          }
        />
      </td>
    </tr>
  );
}

/**
 * The row's Ask why. With room it shows its words. Under a 40 rem card it is a 32 px icon-only ghost button,
 * the same as the Markets grid's, and the tooltip carries the words. On a phone the row layout keeps the icon
 * with a 44 px target.
 */
function AskWhy({ aria, compact, onAsk }: { aria: string; compact: boolean; onAsk: () => void }) {
  const icon = (
    <Sparkles aria-hidden className="size-3.5 text-ai-label" strokeWidth={ICON_STROKE} />
  );
  if (compact) {
    return (
      <AskWhyIconButton label={aria} onAsk={onAsk} className="max-md:min-h-11 max-md:min-w-11" />
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label={aria}
      onClick={onAsk}
      className="max-md:min-h-11 max-md:min-w-11"
    >
      {icon}
      <span className="max-md:sr-only">Ask why</span>
    </Button>
  );
}

/** The market's name as the button that drills into it. */
function MarketButton({
  row,
  select,
  className,
}: {
  row: AttentionRowVM;
  select: (id: string) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => select(row.id)}
      className={cn(
        "rounded-control text-left font-medium text-ink underline-offset-4 hover:underline",
        className,
      )}
    >
      {row.name}
    </button>
  );
}

function MarketCell({ row, select }: { row: AttentionRowVM; select: (id: string) => void }) {
  return (
    <td role="cell" className={cn(CELL, "max-md:p-0 max-md:[grid-area:market]")}>
      <MarketButton row={row} select={select} className="block" />
      <span className="block text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted max-md:hidden">
        {row.region}
      </span>
    </td>
  );
}

function MetricCells({ row }: { row: AttentionRowVM }) {
  return (
    <>
      <td
        role="cell"
        className={cn(
          CELL,
          "text-right text-ink max-md:p-0 max-md:text-left max-md:[grid-area:attain]",
        )}
      >
        {row.attainment}
      </td>
      <td
        role="cell"
        className={cn(CELL, "text-right max-md:p-0 max-md:text-left max-md:[grid-area:yoy]")}
      >
        <Growth pct={row.growthPct}>{row.growth}</Growth>
      </td>
      <td
        role="cell"
        className={cn(CELL, "max-md:justify-self-end max-md:p-0 max-md:[grid-area:spark]")}
      >
        <Sparkline values={row.spark} label={row.sparkLabel} color={SPARK_COLOR[row.status]} />
      </td>
    </>
  );
}

function MoverColumn({
  title,
  id,
  rows,
  rising,
  select,
}: {
  title: string;
  id: string;
  rows: AttentionRowVM[];
  rising: boolean;
  select: (marketId: string) => void;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col">
      <Eyebrow as="h5" id={id} className="flex items-center gap-1.5 pb-1">
        {rising ? (
          <ArrowUpRight aria-hidden className="size-4 text-ok-text" strokeWidth={ICON_STROKE} />
        ) : (
          <ArrowDownRight aria-hidden className="size-4 text-bad-text" strokeWidth={ICON_STROKE} />
        )}
        {title}
      </Eyebrow>
      {rows.length === 0 ? (
        <p className="py-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
          {rising ? "No market is up on last year." : "No market is down on last year."}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="@container -mx-2 flex flex-col">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-grid last:border-b-0">
              {/* The whole row is the link, so it is one button that tints on hover like a table row; its name is its visible text, with hidden separators. */}
              <button
                type="button"
                onClick={() => select(row.id)}
                className={cn(
                  "press flex w-full items-center gap-3 px-2 text-left transition-colors duration-[var(--dur-fast)] hover:bg-surface-2 md:h-[var(--row-h)]",
                  // A phone keeps its two-line row as it was.
                  "max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:py-1 max-md:[grid-template-areas:'name_status'_'growth_spark']",
                  // From md, a list under 24 rem (the panel docked) takes two lines like By region: the name and the
                  // growth figure, then the badge in its 88 px slot and the sparkline. Every column starts at one x.
                  "md:@max-[24rem]:grid md:@max-[24rem]:h-auto md:@max-[24rem]:grid-cols-[88px_minmax(0,1fr)_auto] md:@max-[24rem]:gap-x-2 md:@max-[24rem]:gap-y-1.5 md:@max-[24rem]:py-2",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium text-ink max-md:flex max-md:min-h-11 max-md:items-center max-md:whitespace-normal max-md:[grid-area:name] md:@max-[24rem]:col-span-2">
                  <span className="sr-only">Drill into </span>
                  {row.name}
                  <span className="sr-only">, </span>
                </span>
                <span className="flex md:w-[104px] max-md:justify-self-end max-md:[grid-area:status] md:@max-[24rem]:row-start-2 md:@max-[24rem]:w-[88px]">
                  <StatusBadge status={row.status} label={row.statusLabel} size="md" />
                </span>
                <span className="num w-16 text-right max-md:w-auto max-md:text-left max-md:[grid-area:growth] md:@max-[24rem]:col-start-3 md:@max-[24rem]:row-start-1">
                  <span className="sr-only">, </span>
                  <Growth pct={row.growthPct} rising={rising}>
                    {row.growth}
                  </Growth>
                </span>
                <span className="max-md:justify-self-end max-md:[grid-area:spark] md:@max-[24rem]:col-span-2 md:@max-[24rem]:row-start-2">
                  <Sparkline
                    values={row.spark}
                    label={row.sparkLabel}
                    color={SPARK_COLOR[row.status]}
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ProductsTable({ rows }: { rows: ProductRowVM[] }) {
  return (
    <table
      role="table"
      aria-labelledby="attention-h"
      className="w-full text-[length:var(--text-body)]"
    >
      <thead>
        <tr role="row" className="border-b border-border">
          <th role="columnheader" scope="col" className={HEAD}>
            Product
          </th>
          <th role="columnheader" scope="col" className={cn(HEAD, "text-right")}>
            Revenue
          </th>
          <th role="columnheader" scope="col" className={cn(HEAD, "text-right")}>
            Attain.
          </th>
          <th role="columnheader" scope="col" className={cn(HEAD, "text-right")}>
            YoY
          </th>
          <th role="columnheader" scope="col" className={HEAD}>
            12 months
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} role="row" className={ROW}>
            <th role="rowheader" scope="row" className={cn(CELL, "text-left font-medium text-ink")}>
              {row.name}
            </th>
            <td role="cell" className={cn(CELL, "text-right text-ink")}>
              {row.revenue}
            </td>
            <td role="cell" className={cn(CELL, "text-right text-ink")}>
              {row.attainment}
            </td>
            <td role="cell" className={cn(CELL, "text-right")}>
              <Growth pct={row.growthPct}>{row.growth}</Growth>
            </td>
            <td role="cell" className={CELL}>
              <Sparkline values={row.spark} label={row.sparkLabel} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Markets that need attention, worst first, each with a way to ask why; at market scope, that market's products. */
export function AttentionList({ attention, onSelect, onAsk }: Props) {
  const { setContext } = useConsoleContext();
  const assistant = useAskWhy();
  const select = onSelect ?? ((market: string) => setContext({ market }));
  const ask = onAsk ?? assistant.ask;
  const { attach, narrow } = useNarrowerThan(640);

  if (attention.kind === "products") {
    return (
      <section
        aria-labelledby="attention-h"
        className="flex flex-col gap-3 rounded-sheet layer-card p-[var(--pad-card)]"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <Eyebrow as="h3" id="attention-h">
            Products
          </Eyebrow>
          <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            {attention.caption}
          </p>
        </div>
        {/* A scroller must be reachable by keyboard and named, or a keyboard user cannot see its overflow. */}
        <div
          role="region"
          aria-label="Products table, scrollable"
          tabIndex={0}
          className="overflow-x-auto rounded-control"
        >
          <ProductsTable rows={attention.rows} />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={attach}
      aria-labelledby="attention-h"
      className="flex flex-col gap-3 rounded-sheet layer-card p-[var(--pad-card)]"
    >
      <CardHeader title="Needs attention" titleId="attention-h" subtitle={attention.caption} />
      {attention.rows.length === 0 ? (
        <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
          All markets are on track.
        </p>
      ) : null}
      {attention.rows.length > 0 ? (
        <table
          role="table"
          aria-labelledby="attention-h"
          className="w-full text-[length:var(--text-body)] max-md:block"
        >
          <thead className="max-md:sr-only">
            <tr role="row" className="border-b border-border">
              <th role="columnheader" scope="col" className={HEAD}>
                <span className="sr-only">Rank</span>
                <span aria-hidden>#</span>
              </th>
              <th role="columnheader" scope="col" className={HEAD}>
                Market
              </th>
              <th role="columnheader" scope="col" className={HEAD}>
                Status
              </th>
              <th role="columnheader" scope="col" className={cn(HEAD, "text-right")}>
                Attain.
              </th>
              <th role="columnheader" scope="col" className={cn(HEAD, "text-right")}>
                YoY
              </th>
              <th role="columnheader" scope="col" className={HEAD}>
                12 months
              </th>
              <th role="columnheader" scope="col" className={HEAD}>
                <span className="sr-only">Ask why</span>
              </th>
            </tr>
          </thead>
          <TooltipProvider>
            <tbody className="max-md:block">
              {attention.rows.map((row) => (
                <MarketRow key={row.id} row={row} select={select} ask={ask} compact={narrow} />
              ))}
            </tbody>
          </TooltipProvider>
        </table>
      ) : null}
      <div
        role="group"
        aria-labelledby="movers-h"
        className={cn(
          "flex flex-col gap-2",
          attention.rows.length > 0 && "border-t border-border pt-3",
        )}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 px-3">
          <Eyebrow as="h4" id="movers-h">
            Top movers
          </Eyebrow>
          <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            {attention.sparkCaption}
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-4 px-3 md:grid-cols-2">
          <MoverColumn
            id="movers-rising-h"
            title="Rising"
            rows={attention.rising}
            rising
            select={select}
          />
          <MoverColumn
            id="movers-falling-h"
            title="Falling"
            rows={attention.falling}
            rising={false}
            select={select}
          />
        </div>
      </div>
      <CardCaption>{attention.provenance}</CardCaption>
    </section>
  );
}
