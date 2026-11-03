import type { ReactNode } from "react";

import type { Dataset } from "@/domain";
import { DatasetProvider } from "./dataset";
import { lightDataset, metaFromDataset } from "./invariants";
import { ConsoleMetaProvider } from "./meta";

/**
 * The dataset contexts a feature component reads (console meta and the light dataset), built from one full
 * dataset. Used by the Storybook decorators and the unit tests so both render components with the same inputs.
 */
export function DatasetProviders({ dataset, children }: { dataset: Dataset; children: ReactNode }) {
  return (
    <ConsoleMetaProvider meta={metaFromDataset(dataset)}>
      <DatasetProvider dataset={lightDataset(dataset)}>{children}</DatasetProvider>
    </ConsoleMetaProvider>
  );
}
