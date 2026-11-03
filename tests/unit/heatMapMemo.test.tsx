import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HeatMap, type HeatRow } from "@/components/charts/HeatMap";
import type * as ScalesModule from "@/components/charts/scales";

// attainmentDiverging runs once per cell render, so its call count is the number of cell renders.
const colour = vi.hoisted(() => vi.fn());
vi.mock("@/components/charts/scales", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown> & typeof ScalesModule>();
  return {
    ...actual,
    attainmentDiverging: (v: number) => {
      colour();
      return actual.attainmentDiverging(v);
    },
  };
});

const periods = ["2026-01", "2026-02", "2026-03", "2026-04"];
const rows: HeatRow[] = ["de", "fr", "it"].map((id, i) => ({
  id,
  name: id.toUpperCase(),
  cells: periods.map((period, j) => ({
    period,
    value: 90 + i * 3 + j,
    display: `${90 + i * 3 + j}.0%`,
    actual: 1,
    forecast: 1,
    momPct: undefined,
  })),
}));

const props = { rows, periods, label: "Attainment", onCell: vi.fn() };
const CELLS = rows.length * periods.length;

describe("HeatMap cells", () => {
  beforeEach(() => colour.mockClear());
  afterEach(cleanup);

  it("renders each cell once, then skips all of them when the parent re-renders with the same data", () => {
    const { rerender } = render(<HeatMap {...props} />);
    expect(colour).toHaveBeenCalledTimes(CELLS);

    colour.mockClear();
    // A new onCell identity is what a parent re-render hands down.
    rerender(<HeatMap {...props} onCell={vi.fn()} />);
    expect(colour).not.toHaveBeenCalled();
  });

  it("re-renders only the cells whose selection or tab stop changed", () => {
    const { rerender } = render(
      <HeatMap {...props} selected={{ market: "de", period: "2026-01" }} />,
    );
    colour.mockClear();
    rerender(<HeatMap {...props} selected={{ market: "fr", period: "2026-03" }} />);
    // The old and the new selected cell.
    expect(colour).toHaveBeenCalledTimes(2);
  });

  it("moves with the arrow keys and re-renders only the two cells involved", async () => {
    const user = userEvent.setup();
    render(<HeatMap {...props} />);
    const first = screen.getByRole("gridcell", { name: /DE, Jan 2026/ });
    first.focus();
    colour.mockClear();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("gridcell", { name: /DE, Feb 2026/ })).toHaveFocus();
    expect(colour).toHaveBeenCalledTimes(2);
  });

  it("selects the focused cell with Enter", async () => {
    const onCell = vi.fn();
    const user = userEvent.setup();
    render(<HeatMap {...props} onCell={onCell} />);
    screen.getByRole("gridcell", { name: /FR, Mar 2026/ }).focus();
    await user.keyboard("{Enter}");
    expect(onCell).toHaveBeenCalledWith("fr", "2026-03");
  });
});
