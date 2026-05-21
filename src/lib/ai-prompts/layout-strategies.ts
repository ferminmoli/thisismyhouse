import { z } from "zod";
import type { LayoutVariationStrategy } from "@/lib/floorplan-layout/generate-layout-variations";
import type { TemplateVariantId } from "@/lib/architectural-templates/template-variants";

export const layoutStrategiesOutputSchema = z.object({
  strategies: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      priorityAdjustments: z.object({
        socialAreaBias: z.number().int().min(-2).max(2),
        privateAreaBias: z.number().int().min(-2).max(2),
        patioAreaBias: z.number().int().min(-2).max(2),
        circulationBias: z.number().int().min(-2).max(2),
      }),
      topologyEmphasis: z.array(z.string()),
      avoid: z.array(z.string()),
      idealFor: z.string(),
    }),
  ),
});

export type LayoutStrategySpec = z.infer<
  typeof layoutStrategiesOutputSchema
>["strategies"][number];

export const layoutStrategiesSystemInstruction = `You are a conceptual residential layout strategist.
You do not draw plans. You create alternative layout strategies for a deterministic PlanCompiler.

Return JSON only.
Avoid technical construction language.`;

export type LayoutStrategiesPromptInput = {
  architecturalProgramJson: string;
  structuredBriefJson: string;
};

export function buildLayoutStrategiesPrompt(
  input: LayoutStrategiesPromptInput,
): string {
  return `ARCHITECTURAL PROGRAM:
${input.architecturalProgramJson}

SITE + PREFERENCES:
${input.structuredBriefJson}

TASK:
Generate distinct layout strategies for candidate generation.

Return JSON:
{
  "strategies": [
    {
      "id": "balanced_family" | "social_to_patio" | "privacy_first" | "compact_efficiency" | "wet_core_compact" | "linear_narrow_lot" | "central_patio" | "l_shape_courtyard",
      "label": string,
      "description": string,
      "priorityAdjustments": {
        "socialAreaBias": -2 | -1 | 0 | 1 | 2,
        "privateAreaBias": -2 | -1 | 0 | 1 | 2,
        "patioAreaBias": -2 | -1 | 0 | 1 | 2,
        "circulationBias": -2 | -1 | 0 | 1 | 2
      },
      "topologyEmphasis": string[],
      "avoid": string[],
      "idealFor": string
    }
  ]
}

Rules:
- Return 4 to 8 strategies.
- Strategies must be genuinely different.
- Include at least one conservative/balanced strategy.
- Include at least one strategy that prioritizes the user's strongest preference.
- Do not generate coordinates.`;
}

/** Mapeo estrategia LLM → motor local (sin Gemini). */
const STRATEGY_TO_LOCAL: Record<string, LayoutVariationStrategy> = {
  balanced_family: "balanced",
  social_to_patio: "patio_life",
  privacy_first: "privacy",
  compact_efficiency: "compact",
  wet_core_compact: "integrated_kitchen",
  linear_narrow_lot: "compact",
  central_patio: "patio_life",
  l_shape_courtyard: "balanced",
};

const STRATEGY_TO_VARIANT: Record<string, TemplateVariantId> = {
  balanced_family: "default",
  social_to_patio: "patio_wide",
  privacy_first: "privacy_strong",
  compact_efficiency: "privacy_strong",
  wet_core_compact: "kitchen_integrated",
  linear_narrow_lot: "default",
  central_patio: "patio_wide",
  l_shape_courtyard: "default",
};

export function localVariationStrategyFromId(
  strategyId: string,
): LayoutVariationStrategy {
  return STRATEGY_TO_LOCAL[strategyId] ?? "balanced";
}

export function templateVariantFromStrategyId(
  strategyId: string,
): TemplateVariantId {
  return STRATEGY_TO_VARIANT[strategyId] ?? "default";
}

/** Estrategias por defecto cuando Prompt 3 no corre (onboarding). */
export function defaultLayoutStrategies(
  structuredBrief: import("./types").StructuredBrief,
): LayoutStrategySpec[] {
  const strategies: LayoutStrategySpec[] = [
    {
      id: "balanced_family",
      label: "Familia equilibrada",
      description: "Social, privado y patio en balance",
      priorityAdjustments: {
        socialAreaBias: 0,
        privateAreaBias: 0,
        patioAreaBias: 0,
        circulationBias: 0,
      },
      topologyEmphasis: ["living", "distributor"],
      avoid: [],
      idealFor: "Uso general",
    },
    {
      id: "social_to_patio",
      label: "Vida al patio",
      description: "Living conectado al exterior",
      priorityAdjustments: {
        socialAreaBias: 1,
        privateAreaBias: -1,
        patioAreaBias: 2,
        circulationBias: 0,
      },
      topologyEmphasis: ["patio", "visual_and_physical"],
      avoid: ["bedrooms facing patio only"],
      idealFor: "Clima y parrilla",
    },
    {
      id: "privacy_first",
      label: "Privacidad",
      description: "Dormitorios agrupados lejos del acceso",
      priorityAdjustments: {
        socialAreaBias: 0,
        privateAreaBias: 2,
        patioAreaBias: 0,
        circulationBias: 1,
      },
      topologyEmphasis: ["private_door", "distributor"],
      avoid: ["bedroom to bedroom"],
      idealFor: "Familia con adolescentes",
    },
    {
      id: "wet_core_compact",
      label: "Núcleo húmedo compacto",
      description: "Cocina y baño cerca del distribuidor",
      priorityAdjustments: {
        socialAreaBias: 1,
        privateAreaBias: 0,
        patioAreaBias: 0,
        circulationBias: 0,
      },
      topologyEmphasis: ["kitchen", "bath"],
      avoid: [],
      idealFor: "Eficiencia de servicios",
    },
  ];

  if (structuredBrief.site.assumedLotRatio === "narrow") {
    strategies.push({
      id: "linear_narrow_lot",
      label: "Lote angosto",
      description: "Circulación lineal",
      priorityAdjustments: {
        socialAreaBias: 0,
        privateAreaBias: 0,
        patioAreaBias: -1,
        circulationBias: 1,
      },
      topologyEmphasis: ["linear flow"],
      avoid: ["wide social"],
      idealFor: "Frentes estrechos",
    });
  }

  if (structuredBrief.preferences.patioRelationship === "central") {
    strategies.push({
      id: "central_patio",
      label: "Patio central",
      description: "Patio como corazón del plano",
      priorityAdjustments: {
        socialAreaBias: 0,
        privateAreaBias: 0,
        patioAreaBias: 2,
        circulationBias: 0,
      },
      topologyEmphasis: ["central patio"],
      avoid: [],
      idealFor: "Planta cuadrada",
    });
  }

  return strategies.slice(0, 5);
}
