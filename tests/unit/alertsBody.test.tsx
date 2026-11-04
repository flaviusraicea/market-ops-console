import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlertRule } from "@/domain";
import { writeRules } from "@/features/alerts/storage";
import { AlertsBody } from "@/features/analyst/AlertsBody";
import { TestProviders } from "./helpers";

const rules: AlertRule[] = [
  { id: "r2", metric: "attainment", comparator: "below", threshold: 95, scope: { regionId: "eu" } },
  { id: "r1", metric: "growth", comparator: "below", threshold: -2, scope: "portfolio" },
];

describe("AlertsBody's first frame", () => {
  it("lists the rules it was handed before the first read lands, never 'No rules yet'", () => {
    writeRules(rules);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <TestProviders>
        <QueryClientProvider client={client}>
          <AlertsBody readOnly={false} initialRules={rules} />
        </QueryClientProvider>
      </TestProviders>,
    );
    // No waitFor: this is the first committed render, the frame the placeholder is swapped for.
    expect(screen.getAllByRole("listitem")).toHaveLength(rules.length);
    expect(screen.queryByText("No rules yet")).toBeNull();
  });
});
