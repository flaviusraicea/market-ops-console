import { Suspense } from "react";

import { breadcrumbTrail } from "@/domain";
import { Panel } from "@/features/assistant/Panel";
import { Overview } from "@/features/overview/Overview";
import { OverviewSkeleton } from "@/features/overview/OverviewSkeleton";
import { Header } from "@/features/shell/Header";
import { Layout } from "@/features/shell/Layout";
import { DatasetProvider } from "@/lib/context/dataset";
import { ConsoleMetaProvider } from "@/lib/context/meta";
import { lightDataset, metaFromDataset } from "@/lib/context/invariants";
import { parseContextFromSearchParams } from "@/lib/context/parsers";
import { getDataset } from "@/lib/dataset";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ds = getDataset();
  const ctx = parseContextFromSearchParams(ds, await searchParams);
  const meta = metaFromDataset(ds);
  const productName = ctx.product ? ds.products.find((p) => p.id === ctx.product)?.name : undefined;

  return (
    <ConsoleMetaProvider meta={meta}>
      <Layout
        header={
          <Header
            trail={breadcrumbTrail(ds, ctx)}
            period={ctx.period}
            periods={ds.meta.periods}
            latestPeriod={ds.meta.latestPeriod}
            mode={ctx.mode}
            productName={productName}
          />
        }
        dashboard={
          <Suspense fallback={<OverviewSkeleton />}>
            <Overview ctx={ctx} />
          </Suspense>
        }
        assistant={
          <DatasetProvider dataset={lightDataset(ds)}>
            <Panel />
          </DatasetProvider>
        }
      />
    </ConsoleMetaProvider>
  );
}
