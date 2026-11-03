import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator } from "@storybook/nextjs-vite";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { createContext, useContext, useState, type ReactNode } from "react";

import data from "../src/data/data.json";
import { parseDataset } from "../src/domain/dataset";
import type { Context, Dataset, Period } from "../src/domain";
import { DatasetProviders } from "../src/lib/context/DatasetProviders";
import { RoleContext } from "../src/lib/role";
import { PERSONAS, type Role } from "../src/lib/roles";

type NuqsParameters = {
  searchParams?: string;
  onUrlUpdate?: (event: unknown) => void;
};

const noop = () => undefined;

function ProvidersFrame({
  nuqs,
  role,
  children,
}: {
  nuqs: NuqsParameters;
  role: Role;
  children: ReactNode;
}) {
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
        <RoleContext.Provider
          value={{ role, user: PERSONAS[role], switchRole: noop, signIn: noop, signOut: noop }}
        >
          {children}
        </RoleContext.Provider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
}

/**
 * Global: a fresh QueryClient per story, the nuqs testing adapter and a signed-in role (parameters.role, Executive
 * by default). URL writes reach parameters.nuqs.onUrlUpdate.
 */
export const withProviders: Decorator = (Story, context) => (
  <ProvidersFrame
    nuqs={(context.parameters["nuqs"] ?? {}) as NuqsParameters}
    role={(context.parameters["role"] as Role | undefined) ?? "executive"}
  >
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
/** The parsed fixture dataset, for stories that build their view models. */
export const dataset: Dataset = ds;

/** The default URL context: the whole portfolio at the latest period, Overview mode. */
export const portfolioMay: Context = {
  period: "2026-05" as Period,
  mode: "executive",
  metric: "attainment",
  basis: "month",
};

/** Per story file, for stories under features/. Exposes the dataset and the console meta. */
export const withDataset: Decorator = (Story) => (
  <DatasetContext.Provider value={ds}>
    <DatasetProviders dataset={ds}>
      <Story />
    </DatasetProviders>
  </DatasetContext.Provider>
);
