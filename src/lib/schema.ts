import { z } from "zod";

const zoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["social", "private", "service", "outdoor", "work", "flex"]),
  description: z.string(),
  relativeSize: z.enum(["small", "medium", "large"]),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
}).passthrough();

const doorSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  wall: z.enum(["top", "bottom", "left", "right"]),
  position: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  type: z.enum(["door", "open_passage", "sliding"]),
});

const windowSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  wall: z.enum(["top", "bottom", "left", "right"]),
  position: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  size: z.enum(["small", "medium", "large"]),
  reason: z.string().optional(),
});

export const conceptPlanSchema = z.object({
  title: z.string().min(1),
  disclaimer: z.string().min(1),
  inputSummary: z.string().min(1),
  assumptions: z.array(z.string()),
  zones: z.array(zoneSchema).min(1),
  macroZones: z
    .array(
      z.object({
        kind: z.enum(["access", "social", "private", "service", "outdoor"]),
        label: z.string(),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        width: z.number().min(1).max(100),
        height: z.number().min(1).max(100),
        description: z.string().optional(),
      }),
    )
    .optional(),
  adjacencies: z.array(
    z
      .object({
        from: z.string(),
        to: z.string(),
        reason: z.string(),
        connectionType: z
          .enum(["door", "shared_wall", "visual"])
          .optional(),
        adjacencyStrength: z.enum(["hard", "soft"]).optional(),
      })
      .passthrough(),
  ),
  explanation: z.string().min(1),
  architectQuestions: z.array(z.string()).min(1),
  doors: z.array(doorSchema).optional(),
  windows: z.array(windowSchema).optional(),
  circulation: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        type: z.enum(["primary", "secondary"]),
        reason: z.string().optional(),
      }),
    )
    .optional(),
  validationNotes: z
    .object({
      strengths: z.array(z.string()).optional(),
      risks: z.array(z.string()).optional(),
      needsArchitectReview: z.array(z.string()).optional(),
    })
    .optional(),
  limitations: z.array(z.string()).optional(),
  lot: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export function parseConceptPlan(
  raw: unknown,
): { success: true; data: z.infer<typeof conceptPlanSchema> } | { success: false; error: string } {
  const result = conceptPlanSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const issues = result.error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: issues || "Invalid schema" };
}
