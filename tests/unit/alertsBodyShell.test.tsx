import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlertRule } from "@/domain";
import { writeRules } from "@/features/alerts/storage";
import { AlertsBody } from "@/features/analyst/AlertsBody";
import { AlertsBodyShell } from "@/features/analyst/AlertsBodyShell";
import { TestProviders } from "./helpers";

const rules: AlertRule[] = [
  { id: "r2", metric: "attainment", comparator: "below", threshold: 95, scope: { regionId: "eu" } },
  { id: "r1", metric: "growth", comparator: "below", threshold: -2, scope: "portfolio" },
];

/** Everything that decides where things sit: tags, classes and text. State attributes are left out. */
function skeleton(el: Element): string {
  const STATE =
    /^(id|for|value|disabled|readonly|checked|aria-.*|data-state|data-disabled|data-error|data-placeholder|tabindex|style)$/;
  const attrs = [...el.attributes]
    .filter((a) => !STATE.test(a.name))
    .map((a) => `${a.name}="${a.value}"`)
    .sort()
    .join(" ");
  const own = [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join("");
  // Radix's native <select> is visually hidden; its options take no space.
  const children = el.tagName === "SELECT" ? [] : [...el.children];
  return `<${el.tagName.toLowerCase()} ${attrs}>${own}${children.map(skeleton).join("")}</>`;
}

function renderBody(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TestProviders>
      <QueryClientProvider client={client}>
        <div data-testid="host">{node}</div>
      </QueryClientProvider>
    </TestProviders>,
  );
}

describe("AlertsBody's first frame", () => {
  it("lists the rules it was handed before the first read lands, never 'No rules yet'", () => {
    writeRules(rules);
    renderBody(<AlertsBody readOnly={false} initialRules={rules} />);
    // No waitFor: this is the first committed render, the frame the shell is swapped for.
    expect(screen.getAllByRole("listitem")).toHaveLength(rules.length);
    expect(screen.queryByText("No rules yet")).toBeNull();
  });
});

describe.each([false, true])("the Alerts shell (read-only: %s)", (readOnly) => {
  it("has the loaded body's layout, with every control disabled", async () => {
    writeRules(rules);
    const shell = renderBody(<AlertsBodyShell readOnly={readOnly} rules={rules} />);
    const shellHost = shell.getByTestId("host");
    const controls = [...shellHost.querySelectorAll("input, button, select, textarea")];
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) expect(control).toBeDisabled();
    const shellMarkup = skeleton(shellHost);
    shell.unmount();

    const live = renderBody(<AlertsBody readOnly={readOnly} initialRules={rules} />);
    // The first frame already matches; it still matches once the read lands.
    expect(skeleton(live.getByTestId("host"))).toBe(shellMarkup);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(rules.length));
    expect(skeleton(live.getByTestId("host"))).toBe(shellMarkup);
  });
});
