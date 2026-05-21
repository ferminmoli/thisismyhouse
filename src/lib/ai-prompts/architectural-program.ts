import { formatRoomCountsForPrompt } from "@/lib/onboarding/user-preferences";
import { DEFAULT_ALLOWANCE_FACTOR } from "@/lib/architectural-program/types";
import type { StructuredBrief } from "./types";

export const architecturalProgramSystemInstruction = `You are a Spatial Program Architect for a conceptual residential layout engine.

Your ONLY job is to produce a structured architectural program.
You must NOT produce coordinates, x/y positions, widths, heights, floor plan drawings, construction documents, structural advice, permit advice, or code compliance claims.

The local PlanCompiler will generate and validate geometry later.
Return JSON only. No markdown, no code fences.`;

const SHAPE_HINTS: Record<string, string> = {
  rectangular: "planta alargada o banda continua",
  square: "masa cuadrada compacta",
  l_shape:
    "silueta en L (dos alas habitables; hueco no construible en un brazo)",
};

export type ArchitecturalProgramPromptInput = {
  structuredBrief: StructuredBrief;
  roomCountsText: string;
  targetBuiltAreaM2: number;
  floorCount: number;
};

export function buildArchitecturalProgramPrompt(
  input: ArchitecturalProgramPromptInput,
): string {
  const { structuredBrief: b } = input;
  const shape = SHAPE_HINTS[b.site.massingShape] ?? b.site.massingShape;

  return `STRUCTURED BRIEF:
${JSON.stringify(b, null, 2)}

ROOM COUNTS REQUESTED:
${input.roomCountsText}

TARGET BUILT AREA:
${input.targetBuiltAreaM2} m2

TASK:
Create a residential architectural program for a conceptual layout generator.

Return JSON matching this schema:
{
  "title": string,
  "globalConfig": {
    "targetTotalAreaM2": number,
    "allowanceFactor": ${DEFAULT_ALLOWANCE_FACTOR},
    "areaStrategy": "compact" | "balanced" | "generous",
    "notes": string
  },
  "programmaticZones": [
    {
      "id": "UPPER_SNAKE_CASE",
      "label": string,
      "type": "circulation" | "social" | "service" | "private" | "outdoor",
      "idealAreaM2": number,
      "minAreaM2": number,
      "maxAreaM2": number,
      "aspectRatioRange": [number, number],
      "privacyLevel": 1 | 2 | 3 | 4 | 5,
      "publicness": 1 | 2 | 3 | 4 | 5,
      "requiresExterior": boolean,
      "requiresWetWall": boolean,
      "exteriorAnchor": "front" | "back" | "side" | "any" | "none",
      "priority": 1 | 2 | 3 | 4 | 5
    }
  ],
  "topologyGraph": [
    {
      "from": "ZONE_ID",
      "to": "ZONE_ID",
      "relation": "direct_access" | "open_concept" | "transition_door" | "private_door" | "service_door" | "visual_connection" | "visual_and_physical" | "near" | "avoid_direct",
      "strength": "critical" | "strong" | "medium" | "soft",
      "reason": string
    }
  ],
  "qualityWeights": {
    "circulation": number,
    "privacy": number,
    "light": number,
    "ventilation": number,
    "patioConnection": number,
    "wetCoreEfficiency": number,
    "briefFit": number
  },
  "assumptions": string[],
  "openQuestions": string[]
}

Hard rules:
- globalConfig.targetTotalAreaM2 MUST be ${input.targetBuiltAreaM2}.
- globalConfig.allowanceFactor MUST be ${DEFAULT_ALLOWANCE_FACTOR}.
- Room counts must match requested counts.
- Sum of idealAreaM2 between 85% and 100% of targetTotalAreaM2.
- Every topologyGraph endpoint must exist in programmaticZones.
- Bedrooms must not connect directly to other bedrooms.
- Bathrooms connect through circulation.
- Kitchen and living connect directly if kitchenMode is integrated or semi_open.
- Patio connects to social if outdoorPriority >= 3.
- Include circulation (ACCESO, DISTRIBUIDOR) for 5+ zones.
- Massing: ${shape} (${b.site.massingShape}).
- Floors: ${input.floorCount}.
${b.site.massingShape === "l_shape" ? `- L-shape: sum idealAreaM2 <= ${input.targetBuiltAreaM2}; patio toward L void; social/access front.` : ""}
Output ONLY the JSON object.`;
}

export function buildArchitecturalProgramRepairPrompt(
  input: ArchitecturalProgramPromptInput,
  issues: string,
): string {
  return `${buildArchitecturalProgramPrompt(input)}

PREVIOUS OUTPUT FAILED VALIDATION. Fix and output ONLY valid JSON.

Issues: ${issues}`;
}

export function buildArchitecturalProgramRepairPromptFromOnboarding(
  prefs: import("@/lib/onboarding/user-preferences").UserPreferences,
  issues: string,
  structuredBrief: StructuredBrief,
): string {
  return buildArchitecturalProgramRepairPrompt(
    {
      structuredBrief,
      roomCountsText: formatRoomCountsForPrompt(prefs.roomCounts),
      targetBuiltAreaM2: prefs.lotSize.areaM2,
      floorCount: prefs.floorCount,
    },
    issues,
  );
}

/** Compat con onboarding directo (sin Prompt 1 vía API). */
export function buildArchitecturalProgramPromptFromOnboarding(
  prefs: import("@/lib/onboarding/user-preferences").UserPreferences,
  structuredBrief: StructuredBrief,
): string {
  return buildArchitecturalProgramPrompt({
    structuredBrief,
    roomCountsText: formatRoomCountsForPrompt(prefs.roomCounts),
    targetBuiltAreaM2: prefs.lotSize.areaM2,
    floorCount: prefs.floorCount,
  });
}
