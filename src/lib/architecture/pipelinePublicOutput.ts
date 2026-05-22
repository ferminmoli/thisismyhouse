import type { PipelineInternalResult } from "./generationPipeline";
import type {
  FloorPlanPipelineResult,
  ProgramExtractionResult,
  RunFloorPlanPipelineOptions,
} from "./floorPlanPipelineTypes";
import {
  assertPublicResultSanitized,
  presentFloorPlanPipeline,
} from "./floorPlanResultPresenter";

export function buildPipelineStatus(
  internal: PipelineInternalResult,
): FloorPlanPipelineResult["status"] {
  if (!internal.generatedPlan || internal.validation.errors.length > 0) {
    return "failed";
  }
  if (!internal.recommendedVariant) return "partial";
  return "ok";
}

export function toFloorPlanPipelineResult(
  internal: PipelineInternalResult,
  requestId: string,
  options?: RunFloorPlanPipelineOptions & {
    isAdmin?: boolean;
    isDev?: boolean;
  },
): FloorPlanPipelineResult {
  const presented = presentFloorPlanPipeline(internal, {
    requestId,
    topN: options?.topN ?? 3,
    includeDebug: options?.includePlansInDebug !== false,
    isAdmin: options?.isAdmin,
    isDev: options?.isDev,
  });

  assertPublicResultSanitized(presented.publicResult);

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
    publicResult: presented.publicResult,
    debug: presented.debug,
  };
}
