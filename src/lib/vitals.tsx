"use client";

import { useReportWebVitals } from "next/web-vitals";

/** Mounted once in the root layout. Dev: console table. Production: beacon to a no-op route. */
export function WebVitals() {
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
