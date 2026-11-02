import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/nextjs-vite";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createContext, useContext, useState, type ReactNode } from "react";

import data from "../data/data.json";
import { parseDataset, type Dataset } from "../domain";
import { metaFromDataset } from "../lib/context/invariants";
import { ConsoleMetaProvider } from "../lib/context/meta";

type NuqsParameters = {
  searchParams?: string;
  onUrlUpdate?: (event: unknown) => void;
};

function ProvidersFrame({ nuqs, children }: { nuqs: NuqsParameters; children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <NuqsTestingAdapter
        searchParams={nuqs.searchParams ?? ""}
        hasMemory
        {...(nuqs.onUrlUpdate ? { onUrlUpdate: nuqs.onUrlUpdate } : {})}
      >
        {children}
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
}

/** Global: a fresh QueryClient per story and the nuqs testing adapter. URL writes reach parameters.nuqs.onUrlUpdate. */
export const withProviders: Decorator = (Story, context) => (
  <ProvidersFrame nuqs={(context.parameters["nuqs"] ?? {}) as NuqsParameters}>
    <Story />
  </ProvidersFrame>
);

const DatasetContext = createContext<Dataset | null>(null);

export function useStoryDataset(): Dataset {
  const ds = useContext(DatasetContext);
  if (!ds) throw new Error("useStoryDataset needs the withDataset decorator");
  return ds;
}

const ds = parseDataset(data);

/** Per story file, for stories under features/. Exposes the dataset and the console meta. */
export const withDataset: Decorator = (Story) => (
  <DatasetContext.Provider value={ds}>
    <ConsoleMetaProvider meta={metaFromDataset(ds)}>
      <Story />
    </ConsoleMetaProvider>
  </DatasetContext.Provider>
);
