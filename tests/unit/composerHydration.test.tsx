import { fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MAX_QUESTION_CHARS } from "@/domain";
import { Composer } from "@/features/assistant/Composer";

const props = { value: "", onChange: () => {}, onSubmit: () => {} };

describe("the composer before hydration", () => {
  it("server-renders disabled, saying it is loading, so nothing typed on a slow network is wiped", () => {
    const html = renderToString(<Composer {...props} />);
    const box = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector<HTMLTextAreaElement>("#ask");
    expect(box?.disabled).toBe(true);
    expect(box?.getAttribute("aria-disabled")).toBe("true");
    expect(box?.placeholder).toBe("Loading assistant…");
  });

  it("is enabled with its real placeholder once mounted", () => {
    render(<Composer {...props} />);
    const box = screen.getByRole("textbox", { name: "Ask the assistant" });
    expect(box).toBeEnabled();
    expect(box).not.toHaveAttribute("aria-disabled");
    expect(box).toHaveAttribute("placeholder", "Ask about a market or period…");
  });
});

describe("the composer's limit", () => {
  it("is the route's limit: one character over it cannot be sent, and the counter says so", () => {
    const onSubmit = vi.fn();
    const value = "x".repeat(MAX_QUESTION_CHARS + 1);
    render(<Composer {...props} value={value} onSubmit={onSubmit} />);
    expect(screen.getByText("1,001 / 1,000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Ask the assistant" }), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
