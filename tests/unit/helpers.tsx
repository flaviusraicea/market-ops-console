import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";

import data from "@/data/data.json";
import fixtures from "@/data/fixtures.json";
import { CitationSchema, parseDataset, resolveCitation } from "@/domain";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset, metaFromDataset } from "@/lib/context/invariants";
import { ConsoleMetaProvider } from "@/lib/context/meta";

export const ds = parseDataset(data);

/** The same providers the Storybook decorators give a feature component: URL state, console meta, dataset. */
export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <NuqsTestingAdapter hasMemory>
      <ConsoleMetaProvider meta={metaFromDataset(ds)}>
        <DatasetProvider dataset={lightDataset(ds)}>{children}</DatasetProvider>
      </ConsoleMetaProvider>
    </NuqsTestingAdapter>
  );
}

/** A fixture's text and its citations resolved against the dataset. */
export function resolvedFixture(id: string) {
  const f = fixtures.fixtures.find((x) => x.id === id);
  if (!f) throw new Error(`No fixture ${id}`);
  const citations = f.answer.citations.map((c) => CitationSchema.parse(c));
  return {
    text: f.answer.text,
    citations: citations.map((citation) => ({
      citation,
      resolution: resolveCitation(ds, citation, f.answer.text),
    })),
  };
}
