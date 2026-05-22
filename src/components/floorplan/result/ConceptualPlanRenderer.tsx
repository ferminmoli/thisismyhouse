"use client";

import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { FloorPlanSvgRenderer } from "./FloorPlanSvgRenderer";

export type ConceptualPlanRendererProps = {
  plan: PublicPlanGeometry;
  title: string;
  variantLabel: string;
  variantId: string;
};

/**
 * Legacy conceptual / debug SVG (caption, legend, pastel zones).
 * Only for dev/admin — not the public product renderer.
 */
export function ConceptualPlanRenderer({
  plan,
  title,
  variantLabel,
  variantId,
}: ConceptualPlanRendererProps) {
  return (
    <div data-testid="conceptual-plan-renderer">
      <FloorPlanSvgRenderer
        plan={plan}
        title={title}
        subtitle={variantLabel}
        variantId={variantId}
      />
    </div>
  );
}
