"use client";

import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { publicPlanToGenerated } from "@/lib/architecture/planGeometryAdapter";
import { renderFinalPlanToSvg } from "@/lib/architecture/finalPlanRenderer";
import type { SvgPlanRender } from "@/lib/architecture/floorPlanPipelineTypes";
import { FinalPlanViewer } from "./FinalPlanViewer";
import { useMemo } from "react";

export type FinalPlanRendererProps = {
  plan: PublicPlanGeometry;
  title: string;
  variantLabel: string;
  variantId: string;
  /** Dev/admin wall graph experiment — never true for public users. */
  wallGraphDebug?: boolean;
};

/** Public-facing final floor plan — hero presentation for normal users. */
export function FinalPlanRenderer({
  plan,
  title,
  variantLabel,
  variantId,
  wallGraphDebug = false,
}: FinalPlanRendererProps) {
  const render: SvgPlanRender | null = useMemo(() => {
    return renderFinalPlanToSvg({
      variantId,
      variantLabel,
      plan: publicPlanToGenerated(plan),
      title,
      wallGraphDebug,
    });
  }, [plan, title, variantLabel, variantId, wallGraphDebug]);

  return (
    <FinalPlanViewer
      render={render}
      variantLabel={variantLabel}
      wallGraphDebug={wallGraphDebug}
    />
  );
}
