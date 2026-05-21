import { REQUIRED_DISCLAIMER } from "./safety";

/** Schema for constraint-based procedural layout (NO x/y/width/height per zone). */
export const CONSTRAINT_SCHEMA_HINT = `{
  "layoutVersion": "constraint",
  "title": string,
  "disclaimer": string,
  "inputSummary": string,
  "assumptions": string[],
  "lot": { "width": number, "height": number },
  "zones": [{
    "id": string (UPPER_SNAKE_CASE),
    "label": string,
    "type": "social"|"private"|"service"|"outdoor"|"work"|"flex",
    "idealArea": number,
    "aspectRatioRange": [min, max],
    "group": "access"|"social"|"private"|"service"|"outdoor" (optional),
    "description": string
  }],
  "adjacencies": [{
    "from": string,
    "to": string,
    "type": "shared_wall"|"door_connection",
    "reason": string
  }],
  "explanation": string,
  "architectQuestions": string[]
}`;

const CONSTRAINT_INSTRUCTIONS = `
You are an architectural PROGRAMMER, not a CAD drafter.

The layout engine computes ALL geometry from constraints. You MUST NOT output x, y, width, or height for zones.

INPUT MODEL:
- lot.width × lot.height = total buildable canvas (use 100×100 unless user implies another proportion).
- zones[].idealArea = relative area in lot units² (all idealArea values should sum ≈ lot.width × lot.height).
- zones[].aspectRatioRange = [min, max] width/height ratio (e.g. bathroom [0.55, 1.4], living [0.8, 2.2]).
- adjacencies[].type:
  - "shared_wall": rooms must share a wall segment (kitchen↔dining, bedrooms↔bedrooms).
  - "door_connection": rooms connected by door (access↔living, living↔patio).

AREA GUIDELINES (for lot 100×100 = 10000 total):
- ACCESO / hall: 350–550
- SALA_COMEDOR: 1600–2200
- COCINA: 700–1100
- DORMITORIO principal: 900–1300
- DORMITORIO secondary: 600–900
- BAÑO: 300–450
- LAVADERO: 250–400
- PATIO: 1400–2000
Adjust if user asks smaller/larger home.

ADJACENCY RULES:
- 8–12 intentional adjacencies only (sparse graph, not fully connected).
- Group private bedrooms together.
- Connect social core to patio with door_connection.
- Wet core (bathroom, laundry) near distributor or kitchen.

ASPECT RATIOS:
- Never use extreme ranges that allow paper-thin rooms.
- service rooms: max 1.5 ratio
- flex circulation: [0.4, 2.5] ok

DO NOT include: doors, windows, coordinates, macroZones, dimensions in meters, CAD/BIM claims.

LANGUAGE: match user (Spanish if they write in Spanish).
Accessible architectural tone.`;

/** @deprecated Legacy coordinate schema — kept for repair of old JSON imports */
export const LEGACY_JSON_SCHEMA_HINT = `{
  "title": string,
  "disclaimer": string,
  "zones": [{ "id", "label", "type", "x", "y", "width", "height", ... }],
  "adjacencies": [...],
  "explanation": string,
  "architectQuestions": string[]
}`;

export function buildGenerationPrompt(userPrompt: string): string {
  return `${CONSTRAINT_INSTRUCTIONS}

User brief:
${userPrompt}

Return ONLY valid JSON matching:
${CONSTRAINT_SCHEMA_HINT}

Required:
- layoutVersion: "constraint"
- lot: { width: 100, height: 100 } unless user specifies other proportions
- Sum of idealArea ≈ lot.width × lot.height
- disclaimer exactly: "${REQUIRED_DISCLAIMER}"`;
}

export function buildRepairPrompt(
  userPrompt: string,
  validationError?: string,
  safetyReasons?: string[],
  layoutHints?: string[],
): string {
  const issues = [
    validationError ? `Schema: ${validationError}` : null,
    safetyReasons?.length ? `Safety: ${safetyReasons.join(", ")}` : null,
    layoutHints?.length ? `Layout: ${layoutHints.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `${CONSTRAINT_INSTRUCTIONS}

Previous JSON was invalid.
${issues ? `Fix:\n${issues}\n` : ""}

User brief:
${userPrompt}

JSON only. No markdown. layoutVersion must be "constraint".
${CONSTRAINT_SCHEMA_HINT}
Disclaimer: "${REQUIRED_DISCLAIMER}"`;
}
