import "./zod";
import { z } from "zod";

import { THRESHOLD_RANGE } from "./alertRule";
import { RegionIdSchema } from "./dataset";

export const AlertScopeSchema = z.union([
  z.literal("portfolio"),
  z.object({ regionId: RegionIdSchema }),
  z.object({ marketId: z.string() }),
]);

export const AlertRuleSchema = z
  .object({
    id: z.string().optional(),
    metric: z.enum(["growth", "attainment"]),
    comparator: z.literal("below"),
    threshold: z.number(),
    scope: AlertScopeSchema,
    createdAt: z.string().datetime().optional(),
  })
  .superRefine((r, ctx) => {
    const range = THRESHOLD_RANGE[r.metric];
    if (r.threshold < range.min || r.threshold > range.max) {
      ctx.addIssue({ code: "custom", path: ["threshold"], message: range.message });
    }
  });

export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertScope = z.infer<typeof AlertScopeSchema>;
