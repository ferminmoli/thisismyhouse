"use client";

import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { publicPlanToGenerated } from "@/lib/architecture/planGeometryAdapter";
import { renderPlanToSvg } from "@/lib/architecture/svgRenderer";
import type { SvgPlanRender } from "@/lib/architecture/floorPlanPipelineTypes";
import { PlanSvgViewer } from "./PlanSvgViewer";
import { useMemo } from "react";

export { publicPlanToGenerated } from "@/lib/architecture/planGeometryAdapter";

type Props = {
  plan: PublicPlanGeometry;
  title: string;
  subtitle: string;
  variantId: string;
};

/**
 * Legacy debug/conceptual SVG path (svgRenderer — colorful diagram).
 * Public UI uses FinalPlanRenderer → final-plan/* (monochrome architectural).
 */
export function FloorPlanSvgRenderer({
  plan,
  title,
  subtitle,
  variantId,
}: Props) {
  const render: SvgPlanRender | null = useMemo(() => {
    return renderPlanToSvg({
      variantId,
      variantLabel: subtitle,
      plan: publicPlanToGenerated(plan),
      title,
    });
  }, [plan, title, subtitle, variantId]);

  return <PlanSvgViewer render={render} variantLabel={subtitle} />;
}
