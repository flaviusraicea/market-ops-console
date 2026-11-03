import { Suspense } from "react";

import type { Metadata } from "next";

import { breadcrumbTrail, entityName, entityOf } from "@/domain";
import { Panel } from "@/features/assistant/Panel";
import { Analyst } from "@/features/analyst/Analyst";
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

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const ds = getDataset();
  const ctx = parseContextFromSearchParams(ds, await searchParams);
  return {
    title: `${entityName(ds, entityOf(ctx))} · ${formatPeriod(ctx.period)} · Market Ops`,
  };
}

export default async function Page({ searchParams }: PageProps) {
  const ds = getDataset();
  const ctx = parseContextFromSearchParams(ds, await searchParams);
  const meta = metaFromDataset(ds);

  return (
    <ConsoleMetaProvider meta={meta}>
      <NavigationProvider>
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
            <Suspense fallback={<OverviewSkeleton />}>
              {ctx.mode === "analyst" ? <Analyst ctx={ctx} /> : <Overview ctx={ctx} />}
            </Suspense>
          }
          assistant={
            <DatasetProvider dataset={lightDataset(ds)}>
              <Panel context={panelContextVM(ds, ctx)} />
            </DatasetProvider>
          }
        />
      </NavigationProvider>
    </ConsoleMetaProvider>
  );
}
