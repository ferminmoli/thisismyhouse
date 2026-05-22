import { ARCHITECTURAL_PROGRAM_DISCLAIMER } from "./architecturalProgram";
import type { PipelineInternalResult } from "./generationPipeline";
import type {
  FloorPlanDebugPayload,
  FloorPlanPipelineResult,
  PublicFloorPlanResult,
  PublicVariantSummary,
  ProgramExtractionResult,
  SelectionMethodDebug,
} from "./floorPlanPipelineTypes";
import { generateArchitectBrief } from "./architectBriefGenerator";
import { generateVisualInspirationPrompt } from "./visualInspirationPrompt";
import { renderVariantsToSvg } from "./svgRenderer";
import type { ScoredPlanVariant } from "./planScorer";
import { NEAR_TIE_THRESHOLD } from "./prioritySelection";

const DISCLAIMERS_ES = [
  ARCHITECTURAL_PROGRAM_DISCLAIMER,
  "Plano conceptual para exploración de diseño. No es documento de obra ni habilitante.",
  "Un arquitecto matriculado debe validar orientación, lote, normativa, estructura, instalaciones y superficies antes de construir.",
];

function uniqueVariantsForSvg(
  recommended: ScoredPlanVariant | null,
  top: ScoredPlanVariant[],
): ScoredPlanVariant[] {
  const seen = new Set<string>();
  const out: ScoredPlanVariant[] = [];
  for (const v of [recommended, ...top].filter(Boolean) as ScoredPlanVariant[]) {
    if (seen.has(v.mutationType)) continue;
    seen.add(v.mutationType);
    out.push(v);
  }
  return out;
}

export function buildPublicVariantSummaries(
  top: ScoredPlanVariant[],
): PublicVariantSummary[] {
  return top.map((v) => ({
    variantId: v.mutationType,
    label: v.label,
    rank: v.rank ?? 0,
    summary: v.description,
    highlights: v.score.reasons.slice(0, 3),
  }));
}

export function buildPublicFloorPlanResult(
  internal: PipelineInternalResult,
  requestId: string,
): PublicFloorPlanResult | null {
  const rec = internal.recommendedVariant;
  const recommendation = internal.recommendation;
  if (!rec || !recommendation) return null;

  const svgSource = uniqueVariantsForSvg(rec, internal.topVariants);
  const svgPlans = renderVariantsToSvg(
    svgSource.map((v) => ({
      mutationType: v.mutationType,
      label: v.label,
      plan: v.plan,
    })),
  );

  const architectBrief = generateArchitectBrief({
    program: internal.program,
    strategy: internal.strategy,
    recommended: rec,
    topVariants: internal.topVariants,
    userPrompt: internal.userPrompt,
    confidence: recommendation.confidence,
  });

  const visualInspiration = generateVisualInspirationPrompt({
    program: internal.program,
    strategy: internal.strategy,
    recommended: rec,
    userPrompt: internal.userPrompt,
  });

  return {
    title: internal.program.title,
    recommendedVariantLabel: rec.label,
    recommendedVariantId: rec.mutationType,
    summary: recommendation.narrativeSummary,
    whyRecommended: recommendation.why,
    topVariants: buildPublicVariantSummaries(internal.topVariants),
    svgPlans,
    architectBrief,
    visualInspiration,
    confidence: {
      level: recommendation.confidence.overall,
      reasons: recommendation.confidence.reasons,
    },
    requiredProfessionalReview: recommendation.professionalReview.mustReview,
    disclaimers: DISCLAIMERS_ES,
  };
}

export function buildFloorPlanDebugPayload(
  internal: PipelineInternalResult,
  requestId: string,
  includePlans = true,
): FloorPlanDebugPayload {
  const plansById: Record<string, import("./generatedPlan").GeneratedPlan> = {};
  if (includePlans) {
    if (internal.generatedPlan) {
      plansById[internal.generatedPlan.id] = internal.generatedPlan;
    }
    for (const v of internal.variants) {
      plansById[v.plan.id] = v.plan;
    }
  }

  const selectionMethod: SelectionMethodDebug | null = internal.recommendation
    ?.selectionMethod
    ? {
        ...internal.recommendation.selectionMethod,
        recommendedEqualsTopScored:
          internal.topVariants[0]?.mutationType ===
          internal.recommendedVariant?.mutationType,
      }
    : null;

  const allIssues = internal.scoredVariants.flatMap(
    (v) => v.validation.architecturalIssues,
  );

  const warnings = [
    ...internal.validation.warnings,
    ...internal.generatedPlanValidation.warnings,
    ...internal.topologyValidation.warnings,
  ];

  const timings: FloorPlanDebugPayload["timings"] = internal.stages
    .filter((s) => s.durationMs != null)
    .map((s) => ({
      stageId: s.id,
      label: s.label,
      durationMs: s.durationMs!,
    }));

  const scorerStage = internal.stages.find((s) => s.id === "plan_scorer");
  const ignoredVariants =
    (scorerStage?.output as { ignoredVariants?: FloorPlanDebugPayload["ignoredVariants"] })
      ?.ignoredVariants ?? [];

  return {
    requestId,
    pipelineStages: internal.stages,
    allVariants: internal.scoredVariants,
    ignoredVariants,
    selectionMethod,
    validationDetails: internal.scoredVariants.map((v) => ({
      variantId: v.mutationType,
      planId: v.plan.id,
      validation: v.validation,
    })),
    scoringDetails: internal.scoredVariants.map((v) => ({
      variantId: v.mutationType,
      label: v.label,
      rank: v.rank,
      score: v.score,
    })),
    architecturalIssues: allIssues,
    warnings,
    timings,
    plansById,
    recommendationRaw: internal.recommendation
      ? {
          bestVariantId: internal.recommendation.bestVariantId,
          status: internal.recommendation.recommendationStatus,
          nearTieThreshold: NEAR_TIE_THRESHOLD,
          selectionMethod: internal.recommendation.selectionMethod,
        }
      : null,
  };
}

export function buildPipelineStatus(
  internal: PipelineInternalResult,
): FloorPlanPipelineResult["status"] {
  if (!internal.generatedPlan || internal.validation.errors.length > 0) {
    return "failed";
  }
  if (!internal.recommendedVariant) return "partial";
  return "ok";
}

function buildPartialPublicResult(
  internal: PipelineInternalResult,
): PublicFloorPlanResult {
  const fallbackVariant =
    internal.recommendedVariant ??
    internal.topVariants[0] ??
    internal.scoredVariants[0];
  const brief =
    fallbackVariant && internal.recommendation
      ? generateArchitectBrief({
          program: internal.program,
          strategy: internal.strategy,
          recommended: fallbackVariant,
          topVariants: internal.topVariants,
          userPrompt: internal.userPrompt,
          confidence: internal.recommendation.confidence,
        })
      : {
          projectSummary: internal.program.title,
          recommendedConcept: "Sin variante recomendada.",
          program: { rooms: internal.program.rooms.map((r) => r.label) },
          spatialStrategy: internal.strategy.reasons,
          keyAdjacencies: [],
          serviceCoreNotes: [],
          daylightAndVentilationNotes: [],
          unresolvedQuestions: internal.program.architectQuestions,
          professionalValidationRequired: PROFESSIONAL_CHECKS_ES,
        };

  return {
    title: internal.program.title,
    recommendedVariantLabel: fallbackVariant?.label ?? "",
    recommendedVariantId: fallbackVariant?.mutationType ?? "base",
    summary:
      internal.recommendation?.narrativeSummary ??
      "Pipeline parcial: no hay recomendación final.",
    whyRecommended: internal.recommendation?.why ?? [],
    topVariants: buildPublicVariantSummaries(internal.topVariants),
    svgPlans: fallbackVariant
      ? renderVariantsToSvg([
          {
            mutationType: fallbackVariant.mutationType,
            label: fallbackVariant.label,
            plan: fallbackVariant.plan,
          },
        ])
      : [],
    architectBrief: brief as PublicFloorPlanResult["architectBrief"],
    visualInspiration: fallbackVariant
      ? generateVisualInspirationPrompt({
          program: internal.program,
          strategy: internal.strategy,
          recommended: fallbackVariant,
          userPrompt: internal.userPrompt,
        })
      : {
          prompt: "",
          styleTags: [],
          safetyNote: DISCLAIMERS_ES[2]!,
        },
    confidence: {
      level: internal.recommendation?.confidence.overall ?? "low",
      reasons: internal.recommendation?.confidence.reasons ?? [
        "Pipeline incompleto",
      ],
    },
    requiredProfessionalReview:
      internal.recommendation?.professionalReview.mustReview ?? [],
    disclaimers: DISCLAIMERS_ES,
  };
}

const PROFESSIONAL_CHECKS_ES = [
  "Orientación solar real",
  "Medidas del lote",
  "Normativa municipal",
  "Estructura e instalaciones",
];

export function toFloorPlanPipelineResult(
  internal: PipelineInternalResult,
  requestId: string,
  options?: { includePlansInDebug?: boolean },
): FloorPlanPipelineResult {
  const publicResult =
    buildPublicFloorPlanResult(internal, requestId) ??
    buildPartialPublicResult(internal);

  const extractedProgram: ProgramExtractionResult = {
    program: internal.program,
    mock: internal.extractorMeta.mock,
    model: internal.extractorMeta.model,
  };

  return {
    status: buildPipelineStatus(internal),
    requestId,
    userInput: internal.userPrompt,
    extractedProgram,
    strategy: internal.strategy,
    generatedVariants: internal.variants,
    scoredVariants: internal.scoredVariants,
    topVariants: internal.topVariants,
    recommendedVariant: internal.recommendedVariant,
    publicResult,
    debug: buildFloorPlanDebugPayload(
      internal,
      requestId,
      options?.includePlansInDebug !== false,
    ),
  };
}
