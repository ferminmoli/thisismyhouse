import type { ArchitecturalProgram, LlmProgramExtractorResult } from "./architecturalProgram";
import type { GeneratedPlan, GeneratedPlanValidation, ArchitecturalValidationIssue } from "./generatedPlan";
import type { MutatedPlanResult, MutationType } from "./mutations";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { TopologyGraph } from "./topologyGraph";
import type { ScoredPlanVariant, IgnoredVariantSummary, PlanScoreBreakdown } from "./planScorer";
import type { SelectionMethod } from "./prioritySelection";
import type { RecommendationConfidence } from "./recommendationEngine";
import type { PipelineStage } from "./generationPipeline";

export type PipelineRunStatus = "ok" | "partial" | "failed";

export type ProgramExtractionResult = {
  program: ArchitecturalProgram;
  mock: boolean;
  model: string;
  raw?: LlmProgramExtractorResult;
};

export type ArchitecturalStrategyResult = ArchitecturalStrategy;

export type PlanVariant = MutatedPlanResult;

export type PublicVariantSummary = {
  variantId: string;
  label: string;
  rank: number;
  summary: string;
  highlights: string[];
};

export type SvgLegendItem = {
  key: string;
  label: string;
  color: string;
};

export type SvgPlanRender = {
  variantId: string;
  variantLabel: string;
  svg: string;
  viewBox: string;
  coordinateSystem: "normalized_canvas";
  legend: SvgLegendItem[];
  warnings: string[];
};

export type ArchitectBrief = {
  projectSummary: string;
  recommendedConcept: string;
  program: {
    coveredAreaTargetM2?: number;
    outdoorAreaTargetM2?: number;
    rooms: string[];
  };
  spatialStrategy: string[];
  keyAdjacencies: string[];
  serviceCoreNotes: string[];
  daylightAndVentilationNotes: string[];
  unresolvedQuestions: string[];
  professionalValidationRequired: string[];
};

export type VisualInspirationPrompt = {
  prompt: string;
  negativePrompt?: string;
  styleTags: string[];
  safetyNote: string;
};

export type PublicConfidence = {
  level: RecommendationConfidence["overall"];
  reasons: string[];
};

export type PublicFloorPlanResult = {
  title: string;
  recommendedVariantLabel: string;
  recommendedVariantId: string;
  summary: string;
  whyRecommended: string[];
  topVariants: PublicVariantSummary[];
  svgPlans: SvgPlanRender[];
  architectBrief: ArchitectBrief;
  visualInspiration: VisualInspirationPrompt;
  confidence: PublicConfidence;
  requiredProfessionalReview: string[];
  disclaimers: string[];
};

export type StageTiming = {
  stageId: string;
  label: string;
  durationMs: number;
};

export type SelectionMethodDebug = SelectionMethod & {
  recommendedEqualsTopScored: boolean;
};

export type ValidationResultDebug = {
  variantId: MutationType;
  planId: string;
  validation: GeneratedPlanValidation;
};

export type ScoreBreakdownDebug = {
  variantId: MutationType;
  label: string;
  rank?: number;
  score: PlanScoreBreakdown;
};

export type FloorPlanDebugPayload = {
  requestId: string;
  pipelineStages: PipelineStage[];
  allVariants: ScoredPlanVariant[];
  ignoredVariants: IgnoredVariantSummary[];
  selectionMethod: SelectionMethodDebug | null;
  validationDetails: ValidationResultDebug[];
  scoringDetails: ScoreBreakdownDebug[];
  architecturalIssues: ArchitecturalValidationIssue[];
  warnings: string[];
  timings: StageTiming[];
  plansById: Record<string, GeneratedPlan>;
  recommendationRaw: Record<string, unknown> | null;
};

export type FloorPlanPipelineResult = {
  status: PipelineRunStatus;
  requestId: string;
  userInput: string;
  extractedProgram: ProgramExtractionResult;
  strategy: ArchitecturalStrategyResult;
  generatedVariants: PlanVariant[];
  scoredVariants: ScoredPlanVariant[];
  topVariants: ScoredPlanVariant[];
  recommendedVariant: ScoredPlanVariant | null;
  publicResult: PublicFloorPlanResult;
  debug: FloorPlanDebugPayload;
};

export type RunFloorPlanPipelineOptions = {
  /** Include full plan blobs in debug.plansById (default true). */
  includePlansInDebug?: boolean;
  topN?: number;
};
