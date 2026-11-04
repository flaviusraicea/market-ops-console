import "./zod";
import { z } from "zod";

/**
 * One Core Web Vitals sample as the browser beacons it (lib/vitals.tsx) and the server accepts it
 * (app/api/vitals/route.ts). The client imports only the inferred type, so zod stays on the server.
 */
export const VitalReportSchema = z.object({
  name: z.enum(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]),
  value: z.number().finite().nonnegative(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  id: z.string().max(100),
});
export type VitalReport = z.infer<typeof VitalReportSchema>;
