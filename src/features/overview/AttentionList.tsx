"use client";

import { cn } from "@/components/cn";
import { CardHeader } from "@/components/CardHeader";
import { ArrowDownRight, ArrowUpRight, ICON_STROKE, Sparkles } from "@/components/icons";
import { EYEBROW_CLASS, Eyebrow } from "@/components/Eyebrow";
import { StatusGlyph } from "@/components/StatusGlyph";
import { Sparkline } from "@/components/charts/Sparkline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAskWhy, type AskContext } from "@/features/assistant/askWhy";
import { askContext } from "@/features/assistant/questions";
import type { Status } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
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
}: {
  row: RankedRowVM;
  select: (id: string) => void;
  ask: (text: string, ctx: AskContext) => void;
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
        <Badge variant={row.status}>
          <StatusGlyph status={row.status} />
          {row.statusLabel}
        </Badge>
      </td>
      <MetricCells row={row} />
      <td
        role="cell"
        className={cn(CELL, "text-right max-md:justify-self-end max-md:p-0 max-md:[grid-area:ask]")}
      >
        <Button
          type="button"
          variant="secondary"
          aria-label={row.askWhy.aria}
          onClick={() =>
            ask(
              row.askWhy.text,
              askContext({ kind: "market", marketId: row.id }, row.name, ctx.period),
            )
          }
          className="max-md:min-h-11 max-md:min-w-11"
        >
          <Sparkles aria-hidden className="size-3.5 text-ai-label" strokeWidth={ICON_STROKE} />
          <span className="max-md:sr-only">Ask why</span>
        </Button>
      </td>
    </tr>
  );
}

function MarketCell({ row, select }: { row: AttentionRowVM; select: (id: string) => void }) {
  return (
    <td role="cell" className={cn(CELL, "max-md:p-0 max-md:[grid-area:market]")}>
      <button
        type="button"
        onClick={() => select(row.id)}
        className="block rounded-control text-left font-medium text-ink underline-offset-4 hover:underline"
      >
        {row.name}
      </button>
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
      <Eyebrow as="h4" id={id} className="flex items-center gap-1.5 pb-1">
        {rising ? (
          <ArrowUpRight aria-hidden className="size-4 text-ok-text" strokeWidth={ICON_STROKE} />
        ) : (
          <ArrowDownRight aria-hidden className="size-4 text-bad-text" strokeWidth={ICON_STROKE} />
        )}
        {title}
      </Eyebrow>
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 border-b border-grid last:border-b-0 md:h-[var(--row-h)] max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:py-1 max-md:[grid-template-areas:'name_status'_'growth_spark']"
          >
            <button
              type="button"
              onClick={() => select(row.id)}
              className="min-w-0 flex-1 truncate rounded-control text-left font-medium text-ink underline-offset-4 hover:underline max-md:min-h-11 max-md:[grid-area:name]"
            >
              {row.name}
            </button>
            <span className="flex md:w-24 max-md:justify-self-end max-md:[grid-area:status]">
              <Badge variant={row.status}>
                <StatusGlyph status={row.status} />
                {row.statusLabel}
              </Badge>
            </span>
            <span className="num w-16 text-right max-md:w-auto max-md:text-left max-md:[grid-area:growth]">
              <Growth pct={row.growthPct} rising={rising}>
                {row.growth}
              </Growth>
            </span>
            <span className="max-md:justify-self-end max-md:[grid-area:spark]">
              <Sparkline
                values={row.spark}
                label={row.sparkLabel}
                color={SPARK_COLOR[row.status]}
              />
            </span>
          </li>
        ))}
      </ul>
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

  if (attention.kind === "products") {
    return (
      <section
        aria-labelledby="attention-h"
        className="flex flex-col gap-3 rounded-card layer-card p-[var(--pad-card)]"
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
      aria-labelledby="attention-h"
      className="flex flex-col gap-3 rounded-card layer-card p-[var(--pad-card)]"
    >
      <CardHeader
        title="Needs attention"
        titleId="attention-h"
        subtitle={attention.caption}
        caption={attention.provenance}
      />
      {attention.rows.length === 0 ? (
        <p className="text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink-2">
          All markets are on track.
        </p>
      ) : null}
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
        {attention.rows.length > 0 ? (
          <tbody className="max-md:block">
            {attention.rows.map((row) => (
              <MarketRow key={row.id} row={row} select={select} ask={ask} />
            ))}
          </tbody>
        ) : null}
      </table>
      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <p className="px-3 text-right text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          {attention.sparkCaption}
        </p>
        <div className="grid gap-x-8 gap-y-4 px-3 md:grid-cols-2">
          <MoverColumn
            id="movers-rising-h"
            title="Top movers · rising"
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
    </section>
  );
}
