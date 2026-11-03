import { describe, expect, it } from "vitest";

import { toCsv } from "@/features/analyst/FactsTable";
import type { FactRowVM } from "@/features/analyst/viewModel";

const row: FactRowVM = {
  market: "Germany",
  product: "Veltrix",
  period: "2026-05",
  actual: 694931,
  forecast: 771573,
  priorYear: 699755,
  units: 4151,
  attainment: 90.1,
};

describe("toCsv", () => {
  it("writes a header line and raw numbers, not the formatted cell text", () => {
    expect(toCsv([row]).split("\n")).toEqual([
      "Market,Product,Period,Actual,Forecast,Prior year,Units,Attainment",
      "Germany,Veltrix,2026-05,694931,771573,699755,4151,90.1",
    ]);
  });

  it("quotes values that hold a comma or a quote", () => {
    const line = toCsv([{ ...row, market: `Côte d'Ivoire, "X"` }]).split("\n")[1];
    expect(line?.startsWith(`"Côte d'Ivoire, ""X""",Veltrix`)).toBe(true);
  });

  it("is only the header for no rows", () => {
    expect(toCsv([])).toBe("Market,Product,Period,Actual,Forecast,Prior year,Units,Attainment");
  });
});
