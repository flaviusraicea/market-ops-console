"use client";

import { useEffect } from "react";

import { useConsoleContext } from "@/lib/context/useConsoleContext";

/** Density is derived from the mode in the URL and mirrored onto <html> for the CSS tokens. */
export function useDensity(): "overview" | "analyst" {
  const { ctx } = useConsoleContext();
  const density = ctx.mode === "analyst" ? "analyst" : "overview";
  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);
  return density;
}
