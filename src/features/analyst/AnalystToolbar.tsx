"use client";

import { ICON_STROKE, TableIcon } from "@/components/icons";
import { InfoTip } from "@/components/InfoTip";
import { Button } from "@/components/ui/button";
import { ConnectedLiveToggle } from "@/features/live/LiveToggle";
import { PageToolbar } from "@/features/shell/PageToolbar";
import type { ProductOption } from "@/features/shell/ProductSelect";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { Basis } from "@/domain";
import { BasisSelector } from "./BasisSelector";

/**
 * The sticky Analyst toolbar under the header: period, product, basis and the status rule. These are the
 * controls the sheet reads from; every write goes through `setContext`.
 */
export function AnalystToolbar({
  periods,
  products,
  basis,
  matDisabled,
  statusRule,
}: {
  periods: readonly string[];
  products: readonly ProductOption[];
  basis: Basis;
  matDisabled: boolean;
  statusRule: string;
}) {
  const { ctx, setContext } = useConsoleContext();
  return (
    <PageToolbar
      label="Analyst controls"
      periods={periods}
      products={products}
      extra={
        <>
          <div className="max-md:snap-start">
            <BasisSelector
              basis={basis}
              matDisabled={matDisabled}
              matFallback={ctx.basis === "mat" && basis === "month"}
            />
          </div>
          <div className="max-md:snap-start">
            {/* The same ghost button as "All facts"; the rule opens on click, tap or Enter, and peeks on hover. */}
            <InfoTip label="Status rule" text="Status rule">
              {statusRule}
            </InfoTip>
          </div>
        </>
      }
      trailing={
        /* The header carries the toggle from 768 px; below that it lives here. */
        <div className="shrink-0 md:hidden">
          <ConnectedLiveToggle />
        </div>
      }
      end={
        <Button
          type="button"
          variant="ghost"
          aria-expanded={Boolean(ctx.facts)}
          onClick={() =>
            setContext({ facts: ctx.facts ? undefined : true }, { history: "replace" })
          }
        >
          <TableIcon aria-hidden strokeWidth={ICON_STROKE} />
          {ctx.facts ? "Hide facts" : "All facts"}
        </Button>
      }
    />
  );
}
