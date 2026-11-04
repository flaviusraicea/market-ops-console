"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useEffect } from "react";

import { reportError } from "@/lib/events";

/**
 * Mounted once in the root layout. Vitals: console table in dev, beacon to /api/vitals in production, which logs it.
 * Errors: anything that escapes a widget boundary (a handler throwing, a rejected promise) is reported too.
 */
export function WebVitals() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError(e.error ?? e.message, { source: "window" });
    const onRejection = (e: PromiseRejectionEvent) => reportError(e.reason, { source: "promise" });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") {
      console.table([
        { name: metric.name, value: Math.round(metric.value * 100) / 100, rating: metric.rating },
      ]);
      return;
    }
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    });
    navigator.sendBeacon("/api/vitals", body);
  });
  return null;
}
