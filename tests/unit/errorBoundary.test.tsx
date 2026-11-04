import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Period } from "@/domain";
import { contextKey } from "@/features/shell/contextKey";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { resetErrorReporting } from "@/lib/events";
import { portfolioMay } from "../../.storybook/decorators";

function Widget({ fail }: { fail: boolean }) {
  if (fail) throw new Error("widget failed");
  return <p>Widget content</p>;
}

describe("ErrorBoundary resetKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetErrorReporting();
  });

  it("a failed widget tries again when the context it renders for changes, and not before", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    const view = (key: string) => (
      <ErrorBoundary widget="w" resetKey={key}>
        <Widget fail={fail} />
      </ErrorBoundary>
    );
    const { rerender } = render(view("eu"));
    expect(screen.getByRole("alert")).toHaveTextContent("This widget failed to load");

    // Fixed data, same context: the notice stays, so the reader is not shown a flicker of retries.
    fail = false;
    rerender(view("eu"));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(view("eu|de"));
    expect(screen.getByText("Widget content")).toBeInTheDocument();
  });

  it("contextKey changes with every part of the context a widget's data depends on", () => {
    const base = contextKey(portfolioMay);
    expect(contextKey({ ...portfolioMay, region: "eu" })).not.toBe(base);
    expect(contextKey({ ...portfolioMay, period: "2026-04" as Period })).not.toBe(base);
    expect(contextKey({ ...portfolioMay, mode: "analyst" })).toBe(base);
  });
});
