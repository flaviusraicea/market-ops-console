import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import { getEventLog, resetErrorReporting } from "@/lib/events";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("the route error page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    refresh.mockClear();
    resetErrorReporting();
  });

  it("names what happened, shows the digest as a reference, reports once and offers two ways on", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const reset = vi.fn();
    const error = Object.assign(new Error("Overview failed"), { digest: "abc123" });
    render(<ErrorPage error={error} reset={reset} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "This view couldn’t be shown",
    );
    expect(screen.getByText(/Reference abc123/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the portfolio" })).toHaveAttribute(
      "href",
      "/",
    );

    const report = getEventLog().find((e) => e.type === "error");
    expect(report?.type === "error" && report.report).toMatchObject({
      source: "boundary",
      widget: "page",
      message: "Overview failed",
    });
    expect(consoleError).toHaveBeenCalledTimes(1);

    await act(() => userEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("the root fallback renders its own document with a reload", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<GlobalError error={new Error("layout failed")} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Market Ops couldn’t start",
    );
    expect(screen.getByRole("link", { name: "Reload the console" })).toHaveAttribute("href", "/");
    expect(container.querySelector("main")).not.toBeNull();
  });
});
