import { z } from "zod";
import type { ConstraintPlanInput } from "./types";

const aspectRangeSchema = z.tuple([z.number().positive(), z.number().positive()]);

export const constraintZoneSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["social", "private", "service", "outdoor", "work", "flex"]),
  idealArea: z.number().positive(),
  aspectRatioRange: aspectRangeSchema,
  description: z.string().optional(),
  group: z.string().optional(),
  priority: z.string().optional(),
});

export const constraintAdjacencySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(["shared_wall", "door_connection"]),
  reason: z.string().optional(),
});

export const constraintPlanSchema = z.object({
  layoutVersion: z.literal("constraint"),
  title: z.string().min(1),
  disclaimer: z.string().min(1),
  inputSummary: z.string().min(1),
  assumptions: z.array(z.string()).optional(),
  explanation: z.string().optional(),
  architectQuestions: z.array(z.string()).optional(),
  lot: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  zones: z.array(constraintZoneSchema).min(1),
  adjacencies: z.array(constraintAdjacencySchema),
});

export function parseConstraintPlan(
  raw: unknown,
):
  | { success: true; data: ConstraintPlanInput }
  | { success: false; error: string } {
  const result = constraintPlanSchema.safeParse(raw);
  if (result.success) {
    for (const z of result.data.zones) {
      const [a0, a1] = z.aspectRatioRange;
      if (a0 > a1) {
        return {
          success: false,
          error: `${z.id}: aspectRatioRange min debe ser <= max`,
        };
      }
    }
    return { success: true, data: result.data as ConstraintPlanInput };
  }
  const issues = result.error.issues
    .slice(0, 6)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
  return { success: false, error: issues || "Invalid constraint schema" };
}

export function isConstraintPlanRaw(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.layoutVersion === "constraint") return true;
  const zones = o.zones;
  if (!Array.isArray(zones) || zones.length === 0) return false;
  const z0 = zones[0] as Record<string, unknown>;
  return (
    typeof z0.idealArea === "number" &&
    z0.x === undefined &&
    z0.width === undefined
  );
}
