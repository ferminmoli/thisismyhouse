/**
 * ArcPoc conceptual floor plan pipeline — production entry point.
 *
 * User Prompt → Program Extractor → Topology → Strategy → Parti → Mutations
 * → Validator → Plan Scorer → Recommendation → SVG → Architect Brief → Visual Inspiration
 *
 * Returns `{ publicResult, debug }` via `FloorPlanPipelineResult`.
 */
function newRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
import { runArchitecturalPipelineInternal } from "./generationPipeline";
import type { PipelineStage } from "./generationPipeline";
import {
  toFloorPlanPipelineResult,
  buildPublicFloorPlanResult,
} from "./pipelinePublicOutput";
import type {
  FloorPlanPipelineResult,
  RunFloorPlanPipelineOptions,
} from "./floorPlanPipelineTypes";

export type { FloorPlanPipelineResult, RunFloorPlanPipelineOptions } from "./floorPlanPipelineTypes";
export type {
  PublicFloorPlanResult,
  FloorPlanDebugPayload,
  ArchitectBrief,
  SvgPlanRender,
  VisualInspirationPrompt,
} from "./floorPlanPipelineTypes";

export async function runFloorPlanPipeline(
  userPrompt: string,
  options?: RunFloorPlanPipelineOptions,
): Promise<FloorPlanPipelineResult> {
  const requestId = newRequestId();
  const internal = await runArchitecturalPipelineInternal(userPrompt, {
    debug: true,
  });

  const extraStages: PipelineStage[] = [];
  const tSvg = Date.now();
  const publicPreview = buildPublicFloorPlanResult(internal, requestId);
  extraStages.push({
    id: "svg_renderer",
    label: "SVG Renderer",
    status: publicPreview?.svgPlans.length ? "ok" : "warn",
    durationMs: Date.now() - tSvg,
    output: {
      renderedCount: publicPreview?.svgPlans.length ?? 0,
      variantIds: publicPreview?.svgPlans.map((s) => s.variantId) ?? [],
      coordinateSystem: "normalized_canvas",
    },
    messages: [
      "Render conceptual en canvas 100×100; no es plano de obra.",
    ],
  });

  const tBrief = Date.now();
  extraStages.push({
    id: "architect_brief",
    label: "Architect Brief Generator",
    status: publicPreview?.architectBrief ? "ok" : "warn",
    durationMs: Date.now() - tBrief,
    output: {
      hasRecommendedConcept: Boolean(
        publicPreview?.architectBrief.recommendedConcept,
      ),
      unresolvedCount:
        publicPreview?.architectBrief.unresolvedQuestions.length ?? 0,
    },
  });

  const tVisual = Date.now();
  extraStages.push({
    id: "visual_inspiration",
    label: "Visual Inspiration Prompt",
    status: publicPreview?.visualInspiration.prompt ? "ok" : "warn",
    durationMs: Date.now() - tVisual,
    output: {
      styleTagCount: publicPreview?.visualInspiration.styleTags.length ?? 0,
      safetyNote: publicPreview?.visualInspiration.safetyNote ?? null,
    },
  });

  internal.stages.push(...extraStages);
  if (!internal.debug) {
    internal.debug = {
      stages: internal.stages,
      variants: internal.variants,
      scoredVariants: internal.scoredVariants,
      topVariants: internal.topVariants,
      recommendedVariant: internal.recommendedVariant,
    };
  } else {
    internal.debug.stages = internal.stages;
  }

  return toFloorPlanPipelineResult(internal, requestId, options);
}
