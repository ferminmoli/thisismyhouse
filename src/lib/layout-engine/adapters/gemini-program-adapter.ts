import type { ZoneType } from "@/lib/types";
import { REQUIRED_DISCLAIMER } from "@/lib/floor-plan/types";
import type {
  ConstraintAdjacency,
  ConstraintPlanInput,
  ConstraintZoneSpec,
} from "../types";

import type { ArchitecturalProgram } from "@/lib/architectural-program/types";

/** Alias del programa validado (Gemini / generateArchitecturalProgram). */
export type GeminiProgramJson = ArchitecturalProgram;

const LOT_SIDE = 100;
const LOT_AREA = LOT_SIDE * LOT_SIDE;

export function isGeminiProgramRaw(raw: unknown): raw is GeminiProgramJson {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    Array.isArray(o.programmaticZones) &&
    Array.isArray(o.topologyGraph) &&
    o.globalConfig != null &&
    typeof o.globalConfig === "object"
  );
}

function mapZoneType(type: string): ZoneType {
  switch (type) {
    case "social":
      return "social";
    case "private":
      return "private";
    case "service":
      return "service";
    case "outdoor":
      return "outdoor";
    case "circulation":
      return "flex";
    case "work":
      return "work";
    default:
      return "flex";
  }
}

function mapGroup(type: string): ConstraintZoneSpec["group"] {
  if (type === "circulation") return "access";
  if (type === "social") return "social";
  if (type === "private") return "private";
  if (type === "service") return "service";
  if (type === "outdoor") return "outdoor";
  return "access";
}

function relationToAdjacencyType(
  relation: string,
): ConstraintAdjacency["type"] {
  if (relation === "open_concept") return "shared_wall";
  return "door_connection";
}

/** Escala m² del programa → unidades² del lote 100×100. */
function m2ToLotUnits(m2: number, budgetM2: number): number {
  if (budgetM2 <= 0) return m2;
  return (m2 / budgetM2) * LOT_AREA;
}

/**
 * Convierte el JSON de programa de Gemini al input del motor constraint.
 */
export function geminiProgramToConstraint(
  program: GeminiProgramJson,
  userPrompt?: string,
): ConstraintPlanInput {
  const budgetM2 =
    program.globalConfig.targetTotalAreaM2 *
    program.globalConfig.allowanceFactor;

  const zones: ConstraintZoneSpec[] = program.programmaticZones.map((z) => ({
    id: z.id,
    label: z.label,
    type: mapZoneType(z.type),
    idealArea: m2ToLotUnits(z.idealAreaM2, budgetM2),
    aspectRatioRange: z.aspectRatioRange,
    group: mapGroup(z.type),
    description: `${z.label} — ideal ${z.idealAreaM2} m²${z.minAreaM2 != null ? `, min ${z.minAreaM2} m²` : ""}${z.exteriorAnchor ? `, fachada: ${z.exteriorAnchor}` : ""}`,
    priority: String(z.priority ?? 1),
  }));

  const adjacencies: ConstraintAdjacency[] = program.topologyGraph.map(
    (edge) => ({
      from: edge.from,
      to: edge.to,
      type: relationToAdjacencyType(edge.relation),
      reason: `${edge.relation} (${edge.strength})`,
    }),
  );

  const wet = program.architecturalRules?.wetZonesClustering as
    | Array<{ group: string; elements: string[] }>
    | undefined;

  const assumptions = [
    program.globalConfig.notes ?? "",
    `Programa objetivo: ${program.globalConfig.targetTotalAreaM2} m² × factor ${program.globalConfig.allowanceFactor} = ${budgetM2.toFixed(1)} m² de presupuesto.`,
    `Adaptado a lote lógico ${LOT_SIDE}×${LOT_SIDE} unidades para el motor procedural.`,
  ].filter(Boolean);

  if (wet?.length) {
    assumptions.push(
      `Núcleo húmedo sugerido: ${wet[0].elements.join(", ")}.`,
    );
  }

  return {
    layoutVersion: "constraint",
    title: program.title,
    disclaimer: REQUIRED_DISCLAIMER,
    inputSummary:
      userPrompt ??
      `Programa Gemini: ${program.title} (~${program.globalConfig.targetTotalAreaM2} m²)`,
    assumptions,
    explanation: `Plano derivado del programa espacial en m² (${program.programmaticZones.length} ambientes, ${program.topologyGraph.length} vínculos topológicos).`,
    architectQuestions: [
      "¿El presupuesto de área con allowanceFactor 1.15 es el adecuado?",
      "¿Faltan ambientes o relaciones en el topologyGraph?",
      "¿El patio debe ser mayor respecto al núcleo social?",
    ],
    lot: { width: LOT_SIDE, height: LOT_SIDE },
    zones,
    adjacencies,
  };
}
