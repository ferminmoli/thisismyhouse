import { z } from "zod";
import {
  DEFAULT_ALLOWANCE_FACTOR,
  EXTERIOR_ANCHORS,
  PROGRAM_ZONE_TYPES,
  TOPOLOGY_STRENGTHS,
  type ArchitecturalProgram,
} from "./types";

const upperSnakeId = z
  .string()
  .min(2)
  .regex(/^[A-Z][A-Z0-9_]*$/, "id debe ser UPPER_SNAKE_CASE");

const aspectRatioRange = z
  .tuple([z.number().positive(), z.number().positive()])
  .refine(([min, max]) => min <= max, {
    message: "aspectRatioRange: min debe ser <= max",
  });

export const programmaticZoneSchema = z.object({
  id: upperSnakeId,
  label: z.string().min(1),
  type: z.enum(PROGRAM_ZONE_TYPES),
  idealAreaM2: z.number().positive(),
  aspectRatioRange,
  exteriorAnchor: z.enum(EXTERIOR_ANCHORS),
  priority: z.number().int().positive().optional(),
  minAreaM2: z.number().positive().optional(),
});

export const topologyEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.string().min(1),
  strength: z.enum(TOPOLOGY_STRENGTHS),
  reason: z.string().optional(),
});

export const architecturalProgramSchema = z.object({
  title: z.string().min(1).optional(),
  globalConfig: z.object({
    targetTotalAreaM2: z.number().positive(),
    allowanceFactor: z.number().positive(),
    notes: z.string().optional(),
  }),
  programmaticZones: z.array(programmaticZoneSchema).min(3),
  topologyGraph: z.array(topologyEdgeSchema).min(2),
  architecturalRules: z.record(z.string(), z.unknown()).optional(),
  qualityWeights: z.record(z.string(), z.number()).optional(),
  assumptions: z.array(z.string()).optional(),
  openQuestions: z.array(z.string()).optional(),
});

export type ParseProgramResult =
  | { success: true; data: ArchitecturalProgram }
  | { success: false; error: string };

export function parseArchitecturalProgram(raw: unknown): ParseProgramResult {
  const parsed = architecturalProgramSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .slice(0, 6)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { success: false, error: msg || "Schema validation failed" };
  }

  const d = parsed.data;
  const program: ArchitecturalProgram = {
    title: d.title ?? "Programa arquitectónico",
    globalConfig: {
      ...d.globalConfig,
      allowanceFactor: DEFAULT_ALLOWANCE_FACTOR,
    },
    programmaticZones: d.programmaticZones,
    topologyGraph: d.topologyGraph,
    ...(d.architecturalRules
      ? { architecturalRules: d.architecturalRules }
      : {}),
    ...(d.qualityWeights ? { qualityWeights: d.qualityWeights } : {}),
    ...(d.assumptions ? { assumptions: d.assumptions } : {}),
    ...(d.openQuestions ? { openQuestions: d.openQuestions } : {}),
  };

  return { success: true, data: program };
}
