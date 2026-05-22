import type { GeneratedPlan, GeneratedPlanValidation } from "./generatedPlan";
import type { PipelineResult, PipelineStage } from "./generationPipeline";
import type { MutatedPlanResult } from "./mutations";
import type { PlanScoreBreakdown, ScoredPlanVariant } from "./planScorer";

/** Variante con plano resuelto desde `plansById` (para renderer y debug). */
export type ResolvedVariantView = Omit<MutatedPlanResult, "plan"> & {
  plan: GeneratedPlan;
  planId: string;
  score?: PlanScoreBreakdown;
  rank?: number;
};

function resolvePlan(
  pipeline: PipelineResult,
  planId: string,
): GeneratedPlan | undefined {
  return pipeline.plansById[planId];
}

export function resolveVariantView(
  pipeline: PipelineResult | null | undefined,
  mutationType: string,
): ResolvedVariantView | null {
  if (!pipeline?.variants?.length) return null;
  const ref = pipeline.variants.find((v) => v.mutationType === mutationType);
  if (!ref) return null;
  const plan = resolvePlan(pipeline, ref.planId);
  if (!plan) return null;
  const fullValidation = pipeline.debug?.variants.find(
    (v) => v.mutationType === mutationType,
  )?.validation;
  const validation: GeneratedPlanValidation = fullValidation ?? {
    ok: ref.validationSummary.ok,
    errors: [],
    warnings: [],
    infos: [],
    architecturalIssues: [],
    hardAdjacencyChecks: [],
    doorContactChecks: [],
  };
  return {
    mutationType: ref.mutationType,
    label: ref.label,
    description: ref.description,
    plan,
    planId: ref.planId,
    validation,
    status: ref.status,
    eligibleForRanking: ref.eligibleForRanking,
    messages: ref.messages,
    effect: ref.effect,
    score: ref.score,
    rank: ref.rank,
  };
}

export function getBaseGeneratedPlan(
  pipeline: PipelineResult | null | undefined,
): GeneratedPlan | null {
  if (!pipeline?.generatedPlanId) return null;
  return resolvePlan(pipeline, pipeline.generatedPlanId) ?? null;
}

export function getRecommendedVariantView(
  pipeline: PipelineResult | null | undefined,
): ScoredPlanVariant | null {
  if (!pipeline) return null;
  const rec = pipeline.recommendation;
  if (!rec) return null;
  const view = resolveVariantView(pipeline, rec.bestVariantId);
  if (!view || view.score == null) return null;
  return view as ScoredPlanVariant;
}

export function getTopVariantViews(
  pipeline: PipelineResult | null | undefined,
  n = 3,
): ScoredPlanVariant[] {
  if (!pipeline?.ranking?.length) return [];
  return pipeline.ranking
    .slice(0, n)
    .map((r) => resolveVariantView(pipeline, r.mutationType))
    .filter((v) => v != null && v.score != null)
    .map((v) => v as ScoredPlanVariant);
}

export function getScoredVariantViews(
  pipeline: PipelineResult | null | undefined,
): ScoredPlanVariant[] {
  if (!pipeline?.ranking?.length) return [];
  return pipeline.ranking
    .map((r) => resolveVariantView(pipeline, r.mutationType))
    .filter((v) => v != null && v.score != null)
    .map((v) => v as ScoredPlanVariant);
}

/** Vista legacy para panel de debug con validación completa. */
export function getDebugPipelineView(pipeline: PipelineResult) {
  if (pipeline.debug) {
    return {
      generatedPlan: getBaseGeneratedPlan(pipeline),
      generatedPlanValidation: pipeline.generatedPlanValidation,
      variants: pipeline.debug.variants,
      scoredVariants: pipeline.debug.scoredVariants,
      topVariants: pipeline.debug.topVariants,
      recommendedVariant: pipeline.debug.recommendedVariant,
      stages: pipeline.debug.stages,
    };
  }
  return {
    generatedPlan: getBaseGeneratedPlan(pipeline),
    generatedPlanValidation: pipeline.generatedPlanValidation,
    variants: pipeline.variants
      .map((v) => resolveVariantView(pipeline, v.mutationType))
      .filter((v): v is ResolvedVariantView => v != null),
    scoredVariants: getScoredVariantViews(pipeline),
    topVariants: getTopVariantViews(pipeline, 3),
    recommendedVariant: getRecommendedVariantView(pipeline),
    stages: [] as PipelineStage[],
  };
}
