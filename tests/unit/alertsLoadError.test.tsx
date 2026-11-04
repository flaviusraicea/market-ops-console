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
    await waitFor(() =>
      expect(screen.getAllByText("Couldn’t load rules").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText(/^0 rules/)).toBeNull();
    await openSection();
    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByText("Couldn’t load alert rules")).toBeNull());
    expect(screen.getByText(/^1 rule/)).toBeTruthy();
  });

  it("Dismiss hides the notice but the section still reads as failed", async () => {
    listRules.mockRejectedValue(new Error("500"));
    renderSection();
    await openSection();
    await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(screen.queryByText("Couldn’t load alert rules")).toBeNull());
    expect(screen.getAllByText("Couldn’t load rules").length).toBeGreaterThan(0);
    expect(screen.queryByText(/No alert rules yet/)).toBeNull();
  });
});
