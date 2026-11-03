import { Suspense } from "react";

import type { Metadata } from "next";

import { breadcrumbTrail, entityName, entityOf } from "@/domain";
import { Panel } from "@/features/assistant/Panel";
import { Analyst } from "@/features/analyst/Analyst";
import { AnalystSkeleton, reserveStyle } from "@/features/analyst/AnalystSkeletons";
import { gridRowCount } from "@/features/analyst/viewModel";
import { Overview } from "@/features/overview/Overview";
import { OverviewSkeleton } from "@/features/overview/OverviewSkeleton";
import { panelContextVM } from "@/features/overview/viewModel";
import { Header } from "@/features/shell/Header";
import { Layout } from "@/features/shell/Layout";
import { NavigationProvider } from "@/lib/context/navigation";
import { formatPeriod } from "@/lib/format";
import { DatasetProvider } from "@/lib/context/dataset";
import { ConsoleMetaProvider } from "@/lib/context/meta";
import { lightDataset, metaFromDataset } from "@/lib/context/invariants";
import { parseContextFromSearchParams } from "@/lib/context/parsers";
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
  const ctx = parseContextFromSearchParams(ds, await searchParams, defaultMode);
  const meta = metaFromDataset(ds, defaultMode);
  // The fallback shows until the dashboard streams in, so it has the dashboard's shape: Analyst's own skeleton
  // holds each section at its height, which keeps the swap from shifting the page.
  const fallback =
    ctx.mode === "analyst" ? (
      <AnalystSkeleton
        style={reserveStyle(gridRowCount(ds, ctx), Boolean(ctx.market))}
        facts={Boolean(ctx.facts)}
      />
    ) : (
      <OverviewSkeleton />
    );

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
              <Suspense fallback={fallback}>
                {ctx.mode === "analyst" ? <Analyst ctx={ctx} /> : <Overview ctx={ctx} />}
              </Suspense>
            }
            assistant={<Panel context={panelContextVM(ds, ctx)} />}
          />
        </DatasetProvider>
      </NavigationProvider>
    </ConsoleMetaProvider>
  );
}
