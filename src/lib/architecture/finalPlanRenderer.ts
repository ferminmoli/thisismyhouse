import type { GeneratedPlan } from "./generatedPlan";
import type { SvgPlanRender } from "./floorPlanPipelineTypes";
import { buildPlanViewModel } from "./final-plan/planViewModelBuilder";
import { renderArchitecturalPlanSvg } from "./final-plan/architecturalPlanSvg";

export type FinalPlanRenderInput = {
  variantId: string;
  variantLabel: string;
  plan: GeneratedPlan;
  title?: string;
  showFurniture?: boolean;
  orientationKnown?: boolean;
  /** Dev/admin only — gated via isWallGraphDebugEnabled in UI. */
  wallGraphDebug?: boolean;
};

export const FINAL_PLAN_DISCLAIMER =
  "Plano preliminar conceptual — no apto para obra. Requiere validación profesional.";

/** Public-facing architectural floor plan (Argentine / LatAm conventions). */
export function renderFinalPlanToSvg(
  params: FinalPlanRenderInput,
): SvgPlanRender {
  const wallGraphDebug = params.wallGraphDebug === true;
  const model = buildPlanViewModel(params.plan, {
    variantId: params.variantId,
    variantLabel: params.variantLabel,
    title: params.title,
    showFurniture: params.showFurniture,
    orientationKnown: params.orientationKnown,
    wallGraphDebug,
  });
  return renderArchitecturalPlanSvg(model, { wallGraphDebug });
}

export { buildPlanViewModel } from "./final-plan/planViewModelBuilder";
export { renderArchitecturalPlanSvg } from "./final-plan/architecturalPlanSvg";
