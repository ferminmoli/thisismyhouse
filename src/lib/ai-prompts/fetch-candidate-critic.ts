import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import { buildCandidateSummaries } from "./build-candidate-summaries";
import {
  buildCandidateCriticPrompt,
  candidateCriticSystemInstruction,
} from "./candidate-critic";
import {
  candidateCriticOutputSchema,
  type CandidateCriticOutput,
  type CandidateReview,
} from "./candidate-critic-types";
import { invokeGeminiJson } from "./invoke-gemini-json";
import type { StructuredBrief } from "./types";

function scoreToPct(n: number): number {
  return Math.round(Math.max(0, Math.min(1, n)) * 100);
}

function localCandidateReview(
  variation: LayoutVariation,
  brief: StructuredBrief,
): CandidateReview {
  const s = variation.scores;
  const patioPriority = brief.lifestyle.outdoorPriority >= 4;
  const mainStrength =
    s.patioConnectionScore > 0.75 && patioPriority
      ? "Buen vínculo living–patio para vida al aire libre."
      : s.circulationScore > 0.7
        ? "Circulación clara entre zonas día y noche."
        : variation.description;

  const mainRisk =
    variation.layout.warnings.length > 0
      ? variation.layout.warnings[0]
      : s.compositionScore < 0.6
        ? "El living podría sentirse más generoso en otra variante."
        : "Es un boceto conceptual, no un plano de obra.";

  return {
    candidateId: variation.optionId,
    briefFitScore: scoreToPct(s.compositeScore),
    livabilityScore: scoreToPct((s.circulationScore + s.compositionScore) / 2),
    privacyScore: scoreToPct(s.zoningScore),
    socialOutdoorScore: scoreToPct(
      (s.patioConnectionScore + s.compositionScore) / 2,
    ),
    mainStrength,
    mainRisk,
    bestFor: variation.description,
    architectDiscussionQuestions: [
      "¿Esta distribución encaja con el lote y la orientación solar?",
      "¿Conviene priorizar más patio o más living según cómo vivimos?",
    ],
  };
}

export function localCandidateCritic(
  variations: LayoutVariation[],
  brief: StructuredBrief,
): CandidateCriticOutput {
  const reviews = variations.map((v) => localCandidateReview(v, brief));
  const top = variations[0];
  return {
    candidateReviews: reviews,
    recommendedCandidateId: top?.optionId ?? "A",
    recommendationReason: top
      ? `${top.label} obtiene la mejor puntuación local (${scoreToPct(top.scores.compositeScore)}%) para tu brief.`
      : "Sin candidatos válidos.",
  };
}

export type FetchCandidateCriticResult =
  | {
      ok: true;
      critic: CandidateCriticOutput;
      source: "gemini" | "local";
      model?: string;
    }
  | { ok: false; error: string; fallback: CandidateCriticOutput };

export async function fetchCandidateCritic(
  variations: LayoutVariation[],
  program: ArchitecturalProgram,
  structuredBrief: StructuredBrief,
): Promise<FetchCandidateCriticResult> {
  const fallback = localCandidateCritic(variations, structuredBrief);

  if (variations.length === 0) {
    return { ok: true, critic: fallback, source: "local" };
  }

  if (isProgramMockEnabled()) {
    return { ok: true, critic: fallback, source: "local" };
  }

  const summaries = buildCandidateSummaries(variations);
  const prompt = buildCandidateCriticPrompt({
    structuredBriefJson: JSON.stringify(structuredBrief, null, 2),
    architecturalProgramJson: JSON.stringify(program, null, 2),
    candidateSummariesJson: JSON.stringify(summaries, null, 2),
  });

  const result = await invokeGeminiJson(
    prompt,
    candidateCriticSystemInstruction,
    candidateCriticOutputSchema,
    0.4,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  const ids = new Set(variations.map((v) => v.optionId));
  const reviews = result.data.candidateReviews.filter((r) =>
    ids.has(r.candidateId),
  );
  if (reviews.length === 0) {
    return { ok: false, error: "No matching candidate reviews", fallback };
  }

  const recommendedId = ids.has(result.data.recommendedCandidateId)
    ? result.data.recommendedCandidateId
    : reviews[0].candidateId;

  return {
    ok: true,
    critic: {
      candidateReviews: reviews,
      recommendedCandidateId: recommendedId,
      recommendationReason: result.data.recommendationReason,
    },
    source: "gemini",
    model: result.model,
  };
}
