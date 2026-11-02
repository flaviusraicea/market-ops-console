import { z } from "zod";

import { RegionIdSchema } from "./data";

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
    if (r.metric === "attainment" && (r.threshold < 0 || r.threshold > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["threshold"],
        message: "Enter a value between 0 and 100.",
      });
    }
    if (r.metric === "growth" && (r.threshold < -100 || r.threshold > 100)) {
      ctx.addIssue({
        code: "custom",
        path: ["threshold"],
        message: "Enter a value between −100 and 100.",
      });
    }
  });

export type AlertRule = z.infer<typeof AlertRuleSchema>;
export type AlertScope = z.infer<typeof AlertScopeSchema>;
