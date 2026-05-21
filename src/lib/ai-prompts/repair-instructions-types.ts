import { z } from "zod";

export const repairInstructionsOutputSchema = z.object({
  repairPriority: z.enum(["low", "medium", "high", "discard"]),
  strategyAdjustments: z.array(z.string()),
  areaAdjustments: z.array(
    z.object({
      zoneId: z.string(),
      change: z.enum(["increase", "decrease", "keep"]),
      reason: z.string(),
    }),
  ),
  adjacencyAdjustments: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      change: z.enum(["strengthen", "weaken", "avoid", "keep"]),
      reason: z.string(),
    }),
  ),
  templateHints: z.array(z.string()),
  discardReason: z.string().nullable(),
});

export type RepairInstructionsOutput = z.infer<
  typeof repairInstructionsOutputSchema
>;
