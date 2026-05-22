import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { planToArcadaScene } from "./adapters/planToArcadaScene";
import { renderArcadaPocSvg } from "./render/arcadaPocSvg";
import type { ArcadaPocRenderResult } from "./types/arcadaPocTypes";

export type BuildArcadaPocRenderInput = {
  plan: PublicPlanGeometry;
  title?: string;
  variantLabel?: string;
  variantId?: string;
  devMode?: boolean;
};

export function buildArcadaPocRender(
  input: BuildArcadaPocRenderInput,
): ArcadaPocRenderResult & { variantId: string; variantLabel: string } {
  const { scene, warnings } = planToArcadaScene(input.plan);
  const rendered = renderArcadaPocSvg(scene, {
    title: input.title,
    variantLabel: input.variantLabel,
  });

  if (input.devMode && warnings.length > 0) {
    console.warn("[Arcada POC] adapter warnings:", warnings);
  }

  return {
    ...rendered,
    warnings: [...rendered.warnings, ...warnings],
    variantId: input.variantId ?? input.plan.id,
    variantLabel: input.variantLabel ?? input.plan.variantLabel ?? "",
  };
}
