import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShellGrid } from "@/features/shell/ShellGrid";
import { AssistantRailProvider } from "@/features/shell/railState";
import { resetErrorReporting } from "@/lib/events";
import { TestProviders } from "./helpers";

function BrokenAssistant(): never {
  throw new Error("restore failed");
}

describe("the assistant's error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // jsdom has no viewport; the grid only needs matchMedia to exist. Desktop, so the docked column is mounted.
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetErrorReporting();
  });

  it("a throw in the panel shows the notice in the panel and leaves the dashboard up", () => {
    render(
      <TestProviders>
        <AssistantRailProvider>
          <ShellGrid dashboard={<p>Dashboard content</p>} assistant={<BrokenAssistant />} />
        </AssistantRailProvider>
      </TestProviders>,
    );
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    const notice = screen.getByRole("alert");
    expect(notice).toHaveTextContent("This widget failed to load");
    expect(screen.getByRole("complementary")).toContainElement(notice);
  });
});
