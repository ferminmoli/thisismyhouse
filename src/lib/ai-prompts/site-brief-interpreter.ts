import { z } from "zod";
import {
  structuredBriefFromPreferences,
  type StructuredBrief,
} from "./types";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";

export const siteBriefOutputSchema = z.object({
  site: z.object({
    targetBuiltAreaM2: z.number().positive(),
    lotWidthM: z.number().positive().nullable(),
    lotDepthM: z.number().positive().nullable(),
    assumedLotRatio: z.enum(["compact", "narrow", "wide", "unknown"]),
    accessSide: z.enum(["north", "south", "east", "west", "unknown"]),
    northOrientation: z.enum(["north", "south", "east", "west", "unknown"]),
    massingShape: z.enum(["rectangular", "square", "l_shape"]),
    siteAssumptions: z.array(z.string()),
  }),
  lifestyle: z.object({
    privacyPriority: z.number().int().min(1).max(5),
    socialPriority: z.number().int().min(1).max(5),
    outdoorPriority: z.number().int().min(1).max(5),
    workFromHome: z.boolean(),
    pets: z.boolean(),
    hosting: z.enum(["low", "medium", "high", "unknown"]),
  }),
  preferences: z.object({
    kitchenMode: z.enum(["integrated", "semi_open", "separate", "unknown"]),
    bedroomGrouping: z.enum(["together", "main_separated", "unknown"]),
    patioRelationship: z.enum(["central", "rear", "side", "none", "unknown"]),
    naturalLightPriority: z.number().int().min(1).max(5),
    ventilationPriority: z.number().int().min(1).max(5),
  }),
  openQuestions: z.array(z.string()),
});

export type SiteBriefOutput = z.infer<typeof siteBriefOutputSchema>;

export const siteBriefInterpreterSystemInstruction = `You are a residential pre-architecture intake analyst.
Your job is to interpret a non-technical home brief into structured site, program, and preference data.

You must NOT create a floor plan.
You must NOT output coordinates, dimensions, construction advice, structural advice, permits, code compliance, CAD, BIM, DWG, or build-ready documentation.

Use simple assumptions only when the user did not provide enough information.
Always mark assumptions explicitly.
Return JSON only.`;

export type SiteBriefPromptInput = {
  userBrief: string;
  targetBuiltAreaM2: number;
  roomCountsJson: string;
  floorCount: number;
  planShape: string;
  lotWidthM?: number | null;
  lotDepthM?: number | null;
  accessSide?: string;
  northOrientation?: string;
};

export function buildSiteBriefInterpreterPrompt(
  input: SiteBriefPromptInput,
): string {
  return `USER BRIEF:
${input.userBrief}

KNOWN INPUTS:
- targetBuiltAreaM2: ${input.targetBuiltAreaM2}
- roomCounts: ${input.roomCountsJson}
- floorCount: ${input.floorCount}
- preferredShape: ${input.planShape}
- lotWidthM: ${input.lotWidthM ?? "null"}
- lotDepthM: ${input.lotDepthM ?? "null"}
- accessSide: ${input.accessSide ?? "unknown"}
- northOrientation: ${input.northOrientation ?? "unknown"}

TASK:
Extract structured data for a conceptual residential layout generator.

Return JSON matching this schema:
{
  "site": {
    "targetBuiltAreaM2": number,
    "lotWidthM": number | null,
    "lotDepthM": number | null,
    "assumedLotRatio": "compact" | "narrow" | "wide" | "unknown",
    "accessSide": "north" | "south" | "east" | "west" | "unknown",
    "northOrientation": "north" | "south" | "east" | "west" | "unknown",
    "massingShape": "rectangular" | "square" | "l_shape",
    "siteAssumptions": string[]
  },
  "lifestyle": {
    "privacyPriority": 1 | 2 | 3 | 4 | 5,
    "socialPriority": 1 | 2 | 3 | 4 | 5,
    "outdoorPriority": 1 | 2 | 3 | 4 | 5,
    "workFromHome": boolean,
    "pets": boolean,
    "hosting": "low" | "medium" | "high" | "unknown"
  },
  "preferences": {
    "kitchenMode": "integrated" | "semi_open" | "separate" | "unknown",
    "bedroomGrouping": "together" | "main_separated" | "unknown",
    "patioRelationship": "central" | "rear" | "side" | "none" | "unknown",
    "naturalLightPriority": 1 | 2 | 3 | 4 | 5,
    "ventilationPriority": 1 | 2 | 3 | 4 | 5
  },
  "openQuestions": string[]
}

Rules:
- Do not invent exact lot dimensions unless explicitly provided.
- If information is missing, use null/unknown and add an assumption or open question.
- Keep language concise and non-technical.`;
}

/** Fallback local cuando no hay llamada a Prompt 1. */
export function interpretSiteBriefLocally(
  prefs: UserPreferences,
): StructuredBrief {
  return structuredBriefFromPreferences(prefs);
}

export function buildSiteBriefFromPreferences(
  prefs: UserPreferences,
): SiteBriefPromptInput {
  return {
    userBrief: prefs.basicNeeds,
    targetBuiltAreaM2: prefs.lotSize.areaM2,
    roomCountsJson: JSON.stringify(prefs.roomCounts),
    floorCount: prefs.floorCount,
    planShape: prefs.planShape,
  };
}
