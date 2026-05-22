/**
 * ArcPoc conceptual floor plan pipeline — production entry point.
 *
 * User Prompt → raw pipeline → FloorPlanResultPresenter → { publicResult, debug? }
 */
function newRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

import { runArchitecturalPipelineInternal } from "./generationPipeline";
import { toFloorPlanPipelineResult } from "./pipelinePublicOutput";
import type {
  FloorPlanPipelineResult,
  RunFloorPlanPipelineOptions,
} from "./floorPlanPipelineTypes";

export type { FloorPlanPipelineResult, RunFloorPlanPipelineOptions } from "./floorPlanPipelineTypes";
export type {
  PublicFloorPlanResult,
  PresentedFloorPlanResult,
  FloorPlanDebug,
  PublicFloorPlanVariant,
  PublicArchitectBrief,
  SvgPlanRender,
} from "./floorPlanPipelineTypes";

export {
  presentFloorPlanPipeline,
  FloorPlanResultPresenter,
} from "./floorPlanResultPresenter";

export async function runFloorPlanPipeline(
  userPrompt: string,
  options?: RunFloorPlanPipelineOptions,
): Promise<FloorPlanPipelineResult> {
  const requestId = newRequestId();
  const internal = await runArchitecturalPipelineInternal(userPrompt, {
    debug: true,
  });
  return toFloorPlanPipelineResult(internal, requestId, options);
}
