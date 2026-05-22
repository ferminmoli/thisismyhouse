import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan, GeneratedPlanValidation } from "./generatedPlan";
import type { MutatedPlanResult, MutationType } from "./mutations";
import type { EnrichedPlanRecommendation } from "./recommendationEngine";
import type { ScoredPlanVariant } from "./planScorer";
import type { SelectionMethod } from "./prioritySelection";
import type { PlanScoreBreakdown } from "./planScorer";
import type { MutationEffect } from "./mutationEffect";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { TopologyGraph } from "./topologyGraph";
import type {
  PipelineInternalResult,
  PipelineStage,
  PipelineValidation,
} from "./generationPipeline";

export type ValidationSummary = {
  ok: boolean;
  errorCount: number;
  warningCount: number;
  architecturalIssueCount: number;
};

export type CompactVariantRef = {
  mutationType: MutationType;
  label: string;
  description: string;
  planId: string;
  status: MutatedPlanResult["status"];
  eligibleForRanking: boolean;
  score?: PlanScoreBreakdown;
  rank?: number;
  validationSummary: ValidationSummary;
  effect: MutationEffect;
  messages: string[];
};

export type RankingEntry = {
  rank: number;
  mutationType: MutationType;
  label: string;
  planId: string;
  totalScore: number;
  selectionNotes: string[];
};

export type CompactRecommendation = EnrichedPlanRecommendation & {
  bestPlanId: string;
  selectionMethod: SelectionMethod;
};

export type CompactPipelineResponse = {
  userPrompt: string;
  program: ArchitecturalProgram;
  topologyGraph: TopologyGraph;
  topologyValidation: PipelineValidation;
  strategy: ArchitecturalStrategy;
  generatedPlanId: string | null;
  generatedPlanValidation: GeneratedPlanValidation;
  plansById: Record<string, GeneratedPlan>;
  variants: CompactVariantRef[];
  ranking: RankingEntry[];
  recommendation: CompactRecommendation | null;
  validation: PipelineValidation;
  extractorMeta: PipelineInternalResult["extractorMeta"];
};

export type PipelineDebugPayload = {
  stages: PipelineStage[];
  variants: MutatedPlanResult[];
  scoredVariants: ScoredPlanVariant[];
  topVariants: ScoredPlanVariant[];
  recommendedVariant: ScoredPlanVariant | null;
};

export type NormalizedPipelineResult = CompactPipelineResponse & {
  debug?: PipelineDebugPayload;
};

function validationSummary(v: GeneratedPlanValidation): ValidationSummary {
  return {
    ok: v.ok,
    errorCount: v.errors.length,
    warningCount: v.warnings.length,
    architecturalIssueCount: v.architecturalIssues.length,
  };
}

function variantToCompact(v: MutatedPlanResult): CompactVariantRef {
  const scored = v as ScoredPlanVariant;
  return {
    mutationType: v.mutationType,
    label: v.label,
    description: v.description,
    planId: v.plan.id,
    status: v.status,
    eligibleForRanking: v.eligibleForRanking,
    score: scored.score,
    rank: scored.rank,
    validationSummary: validationSummary(v.validation),
    effect: v.effect,
    messages: v.messages,
  };
}

export function buildNormalizedPipelineResponse(
  internal: PipelineInternalResult,
): NormalizedPipelineResult {
  const plansById: Record<string, GeneratedPlan> = {};

  if (internal.generatedPlan) {
    plansById[internal.generatedPlan.id] = internal.generatedPlan;
  }

  for (const v of internal.variants) {
    plansById[v.plan.id] = v.plan;
  }

  const variants = internal.variants.map((v) => {
    const scored = internal.scoredVariants.find(
      (s) => s.mutationType === v.mutationType,
    );
    const merged = scored ? { ...v, ...scored } : v;
    return variantToCompact(merged as MutatedPlanResult);
  });

  const ranking: RankingEntry[] = internal.scoredVariants
    .filter((v) => v.rank != null)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .map((v) => ({
      rank: v.rank!,
      mutationType: v.mutationType,
      label: v.label,
      planId: v.plan.id,
      totalScore: v.score.total,
      selectionNotes: v.score.reasons.slice(0, 3),
    }));

  const recommendation: CompactRecommendation | null =
    internal.recommendation && internal.recommendedVariant
      ? {
          ...internal.recommendation,
          bestPlanId: internal.recommendedVariant.plan.id,
          selectionMethod: internal.recommendation.selectionMethod!,
        }
      : null;

  const compact: CompactPipelineResponse = {
    userPrompt: internal.userPrompt,
    program: internal.program,
    topologyGraph: internal.topologyGraph,
    topologyValidation: internal.topologyValidation,
    strategy: internal.strategy,
    generatedPlanId: internal.generatedPlan?.id ?? null,
    generatedPlanValidation: internal.generatedPlanValidation,
    plansById,
    variants,
    ranking,
    recommendation,
    validation: internal.validation,
    extractorMeta: internal.extractorMeta,
  };

  if (internal.debug) {
    return {
      ...compact,
      debug: internal.debug,
    };
  }

  return compact;
}
