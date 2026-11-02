import { breadcrumbTrail } from "@/domain";
import { Header } from "@/features/shell/Header";
import { Layout } from "@/features/shell/Layout";
import { ConsoleMetaProvider } from "@/lib/context/meta";
import { metaFromDataset } from "@/lib/context/invariants";
import { parseContextFromSearchParams } from "@/lib/context/parsers";
import { getDataset } from "@/lib/data/getDataset";

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
      >
        <main
          id="main"
          className="grid gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_var(--assistant-w)]"
        >
          <section aria-labelledby="dashboard-h" className="min-h-64">
            <h2 id="dashboard-h" className="sr-only">
              Dashboard
            </h2>
          </section>
          <section aria-labelledby="assistant-h" className="min-h-64">
            <h2 id="assistant-h" className="sr-only">
              Assistant
            </h2>
          </section>
        </main>
      </Layout>
    </ConsoleMetaProvider>
  );
}
