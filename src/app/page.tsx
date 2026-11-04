import type { Metadata } from "next";

import { breadcrumbTrail, entityName, entityOf } from "@/domain";
import { Panel } from "@/features/assistant/Panel";
import { Analyst } from "@/features/analyst/Analyst";
import { Overview } from "@/features/overview/Overview";
import { panelContextVM } from "@/features/overview/viewModel";
import { Header } from "@/features/shell/Header";
import { ResetNotice } from "@/features/shell/ResetNotice";
import { Layout } from "@/features/shell/Layout";
import { NavigationProvider } from "@/lib/context/navigation";
import { formatPeriod } from "@/lib/format";
import { DatasetProvider } from "@/lib/context/dataset";
import { ConsoleMetaProvider } from "@/lib/context/meta";
import { lightDataset, metaFromDataset } from "@/lib/context/invariants";
import { hrefFor } from "@/lib/context/href";
import { parseContextFromSearchParams } from "@/lib/context/parsers";
import { describeContextReset } from "@/lib/context/reset";
import { getDataset } from "@/lib/dataset";
import { defaultModeFor } from "@/lib/roles";
import { readRole } from "@/lib/roles.server";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The view a URL without `mode` opens on: the signed-in role's. */
async function roleDefaultMode() {
  return defaultModeFor(await readRole());
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const ds = getDataset();
  const ctx = parseContextFromSearchParams(ds, await searchParams, await roleDefaultMode());
  return {
    title: `${entityName(ds, entityOf(ctx))} · ${formatPeriod(ctx.period)} · Market Ops`,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const ds = getDataset();
  const defaultMode = await roleDefaultMode();
  const params = await searchParams;
  const ctx = parseContextFromSearchParams(ds, params, defaultMode);
  const meta = metaFromDataset(ds, defaultMode);
  // An unknown or out-of-range value falls back when parsed. The page renders the fallback and says so; the
  // ResetNotice then puts the fallback in the address too, so a copied link and Back show what is on screen.
  // The new address holds Context parameters only; nothing else is read on `/`.
  const entity = entityOf(ctx);
  const reset = describeContextReset(params, ctx, {
    scope: entity.kind === "portfolio" ? "portfolio" : entityName(ds, entity),
    period: formatPeriod(ctx.period),
  });
  const resetNotice = <ResetNotice reset={reset} href={hrefFor(meta, ctx)} />;
  // No Suspense around the dashboard: nothing in it waits, so a boundary here only held the whole view behind a
  // skeleton until React revealed it, which delayed the largest paint on Analyst. Each lazy Analyst section
  // has its own boundary (AnalystIslands), so a mode switch still shows a placeholder per section.
  return (
    <ConsoleMetaProvider meta={meta}>
      <NavigationProvider>
        <DatasetProvider dataset={lightDataset(ds)}>
          <Layout
            header={
              <Header
                trail={breadcrumbTrail(ds, ctx)}
                products={ds.products.map((p) => ({ id: p.id, name: p.name }))}
                period={ctx.period}
                periods={ds.meta.periods}
                latestPeriod={ds.meta.latestPeriod}
                mode={ctx.mode}
              />
            }
            dashboard={
              ctx.mode === "analyst" ? (
                <Analyst ctx={ctx} notice={resetNotice} />
              ) : (
                <Overview ctx={ctx} notice={resetNotice} />
              )
            }
            assistant={<Panel context={panelContextVM(ds, ctx)} />}
          />
        </DatasetProvider>
      </NavigationProvider>
    </ConsoleMetaProvider>
  );
}
