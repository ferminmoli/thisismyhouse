import type { ArchitecturalProgram, LlmProgramExtractorResult } from "./architecturalProgram";
import type { ArchitecturalStrategy } from "./strategySelector";
import type {
  FloorPlanDebug,
  PresentedFloorPlanResult,
  PresentFloorPlanPipelineOptions,
  PublicArchitectBrief,
  PublicAreaEstimate,
  PublicConfidence,
  PublicDoor,
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
  PublicFurniture,
  PublicPlanGeometry,
  PublicProfessionalReview,
  PublicVisualInspiration,
  PublicWindow,
  PublicZone,
} from "./publicFloorPlanTypes";

export type {
  FloorPlanDebug,
  PresentedFloorPlanResult,
  PresentFloorPlanPipelineOptions,
  PublicArchitectBrief,
  PublicAreaEstimate,
  PublicConfidence,
  PublicDoor,
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
  PublicFurniture,
  PublicPlanGeometry,
  PublicProfessionalReview,
  PublicVisualInspiration,
  PublicWindow,
  PublicZone,
};

/** @deprecated Use PublicArchitectBrief on PublicFloorPlanResult. */
export type ArchitectBrief = PublicArchitectBrief;

/** @deprecated Use PublicVisualInspiration. */
export type VisualInspirationPrompt = PublicVisualInspiration & {
  styleTags?: string[];
  safetyNote?: string;
};

export type PipelineRunStatus = "ok" | "partial" | "failed";

export type ProgramExtractionResult = {
  program: ArchitecturalProgram;
  mock: boolean;
  model: string;
  raw?: LlmProgramExtractorResult;
};

export type ArchitecturalStrategyResult = ArchitecturalStrategy;

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

/** @deprecated Legacy debug shape — prefer FloorPlanDebug from presenter. */
export type FloorPlanDebugPayload = FloorPlanDebug & {
  pipelineStages?: unknown[];
  allVariants?: unknown[];
  ignoredVariants?: unknown[];
  selectionMethod?: unknown;
  validationDetails?: unknown[];
  scoringDetails?: unknown[];
  architecturalIssues?: unknown[];
  plansById?: Record<string, unknown>;
};

/**
 * Product-facing pipeline response.
 * Normal UI should read only `publicResult`; inspect `debug` in dev/admin mode.
 */
export type FloorPlanPipelineResult = {
  status: PipelineRunStatus;
  requestId: string;
  userInput: string;
  extractedProgram: ProgramExtractionResult;
  strategy: ArchitecturalStrategyResult;
  publicResult: PublicFloorPlanResult;
  debug?: FloorPlanDebug;
};

export type RunFloorPlanPipelineOptions = {
  /** Include debug bundle in the pipeline result (default: follow env dev/admin flags). */
  includeDebug?: boolean;
  isAdmin?: boolean;
  isDev?: boolean;
  topN?: number;
};
