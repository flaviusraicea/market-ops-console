import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AlertRule } from "@/domain";
import { AlertsSection } from "@/features/analyst/AlertsSection";

const rule: AlertRule = {
  id: "r1",
  metric: "attainment",
  comparator: "below",
  threshold: 95,
  scope: { regionId: "eu" },
};

const listRules = vi.fn();
vi.mock("@/features/alerts/api", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  alertApi: { listRules: () => listRules(), saveRule: vi.fn(), deleteRule: vi.fn() },
}));
vi.mock("@/lib/context/dataset", () => ({
  useDataset: () => ({ markets: [], regions: [], products: [], meta: { periods: [] } }),
}));

/** The form and its rules load with a dynamic import, which a busy CI runner can take over a second to resolve. */
const LAZY_TIMEOUT = 5_000;

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AlertsSection />
    </QueryClientProvider>,
  );
}

async function openSection() {
  const heading = await screen.findByRole("heading", { name: /^Alerts/ });
  const trigger = within(heading).getByRole("button");
  if (trigger.getAttribute("aria-expanded") !== "true") await userEvent.click(trigger);
}

describe("Alerts when the saved rules cannot be read", () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.localStorage.clear();
    listRules.mockReset();
  });

  it("says it could not load, never '0 rules', and Retry brings the rules back", async () => {
    listRules.mockRejectedValueOnce(new Error("500"));
    listRules.mockResolvedValue([rule]);
    renderSection();
    // The rules are read when the section opens (the form loads then).
    await openSection();
    await waitFor(
      () => expect(screen.getAllByText("Couldn’t load rules").length).toBeGreaterThan(0),
      { timeout: LAZY_TIMEOUT },
    );
    expect(screen.queryByText(/^0 rules/)).toBeNull();
    await userEvent.click(
      await screen.findByRole("button", { name: "Retry" }, { timeout: LAZY_TIMEOUT }),
    );
    await waitFor(() => expect(screen.queryByText("Couldn’t load alert rules")).toBeNull());
    // The folded row stops reading as failed, and the rule is listed. (The row's count comes from storage,
    // which the mocked API does not write.)
    expect(screen.queryByText("Couldn’t load rules")).toBeNull();
    expect(screen.getAllByText(/95/).length).toBeGreaterThan(0);
  });

  it("Dismiss hides the notice but the section still reads as failed", async () => {
    listRules.mockRejectedValue(new Error("500"));
    renderSection();
    await openSection();
    await userEvent.click(
      await screen.findByRole("button", { name: "Dismiss" }, { timeout: LAZY_TIMEOUT }),
    );
    await waitFor(() => expect(screen.queryByText("Couldn’t load alert rules")).toBeNull());
    expect(screen.getAllByText("Couldn’t load rules").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No alert rules yet/)).toBeNull();
  });
});
