import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { PlanQualityScores } from "@/lib/architectural-templates/plan-scoring";
import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import { invokeGeminiJson } from "./invoke-gemini-json";
import type { StructuredBrief } from "./types";
import {
  buildUserExplanationPrompt,
  userExplanationSystemInstruction,
} from "./user-explanation";
import {
  userExplanationSchema,
  type UserFacingExplanation,
} from "./user-explanation-types";

const DISCLAIMER =
  "Es una idea de distribución conceptual para conversar. Un arquitecto debe validar y diseñar el proyecto real.";

function localUserExplanation(
  variation: LayoutVariation,
  brief: StructuredBrief,
  scores: PlanQualityScores,
): UserFacingExplanation {
  const patioHigh = brief.lifestyle.outdoorPriority >= 4;
  const why: string[] = [
    `Prioriza ${variation.description.toLowerCase()}.`,
    `Calidad global estimada ${Math.round(scores.compositeScore * 100)}%.`,
  ];
  if (variation.layout.templateMeta) {
    why.push(
      `Composición basada en plantilla ${variation.layout.templateMeta.templateLabel}.`,
    );
  }
  if (patioHigh && scores.patioConnectionScore > 0.7) {
    why.push("El living y el patio están bien conectados para vida al aire libre.");
  }

  const tradeoffs: string[] = [];
  if (scores.compositionScore < 0.65) {
    tradeoffs.push("El living podría sentirse más generoso en otra variante.");
  }
  if (variation.layout.warnings.length > 0) {
    tradeoffs.push("Hay avisos menores de validación — revisar con el arquitecto.");
  }
  if (tradeoffs.length === 0) {
    tradeoffs.push("Es un boceto conceptual, no un plano de obra.");
  }

  return {
    headline: variation.label,
    shortSummary: `${variation.description}. Ideal si buscás ${brief.preferences.patioRelationship !== "none" ? "buen vínculo con el exterior" : "una casa equilibrada"}.`,
    whyItFits: why,
    tradeoffs,
    questionsForArchitect: [
      "¿Esta distribución encaja con el lote real y la orientación solar?",
      "¿Conviene ampliar el living o el patio según cómo vivimos el día a día?",
      "¿Dónde ubicarían ustedes el núcleo húmedo (cocina y baños)?",
    ],
    disclaimer: DISCLAIMER,
  };
}

export type FetchUserExplanationInput = {
  variation: LayoutVariation;
  program: ArchitecturalProgram;
  structuredBrief: StructuredBrief;
};

export type FetchUserExplanationResult =
  | {
      ok: true;
      explanation: UserFacingExplanation;
      source: "gemini" | "local";
      model?: string;
    }
  | { ok: false; error: string; fallback: UserFacingExplanation };

export async function fetchUserExplanation(
  input: FetchUserExplanationInput,
): Promise<FetchUserExplanationResult> {
  const { variation, program, structuredBrief } = input;
  const scores = variation.scores;
  const fallback = localUserExplanation(
    variation,
    structuredBrief,
    scores,
  );

  if (isProgramMockEnabled()) {
    return { ok: true, explanation: fallback, source: "local" };
  }

  const candidateSummary = {
    optionId: variation.optionId,
    label: variation.label,
    description: variation.description,
    templateId: variation.layout.templateMeta?.templateId,
    zoneCount: variation.layout.zones.length,
    warnings: variation.layout.warnings.slice(0, 5),
    scores,
  };

  const prompt = buildUserExplanationPrompt({
    selectedCandidateJson: JSON.stringify(candidateSummary, null, 2),
    structuredBriefJson: JSON.stringify(structuredBrief, null, 2),
    scoresJson: JSON.stringify(scores, null, 2),
  });

  const result = await invokeGeminiJson(
    prompt,
    userExplanationSystemInstruction,
    userExplanationSchema,
    0.6,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  return {
    ok: true,
    explanation: result.data,
    source: "gemini",
    model: result.model,
  };
}
