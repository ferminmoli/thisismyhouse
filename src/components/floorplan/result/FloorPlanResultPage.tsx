"use client";

import type {
  FloorPlanDebug,
  FloorPlanPipelineResult,
  PublicFloorPlanResult,
} from "@/lib/architecture/floorPlanPipelineTypes";
import type { PresentedFloorPlanResult } from "@/lib/architecture/publicFloorPlanTypes";
import { FloorPlanResultView } from "./FloorPlanResultView";

/** @deprecated Prefer FloorPlanResultView with PresentedFloorPlanResult. */
export type FloorPlanResultPageProps = {
  publicResult: PublicFloorPlanResult | null;
  debug?: FloorPlanDebug | null;
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  isDev?: boolean;
  onVariantChange?: (variantId: string) => void;
};

function toPresented(
  publicResult: PublicFloorPlanResult | null,
  debug?: FloorPlanDebug | null,
): PresentedFloorPlanResult | null {
  if (!publicResult) return null;
  return { publicResult, debug: debug ?? undefined };
}

export function pipelineResultToPresented(
  pipeline: FloorPlanPipelineResult | null,
): PresentedFloorPlanResult | null {
  if (!pipeline?.publicResult) return null;
  return {
    publicResult: pipeline.publicResult,
    debug: pipeline.debug,
  };
}

export function FloorPlanResultPage(props: FloorPlanResultPageProps) {
  return (
    <FloorPlanResultView
      result={toPresented(props.publicResult, props.debug)}
      loading={props.loading}
      error={props.error}
      isAdmin={props.isAdmin}
      isDev={props.isDev}
      onVariantChange={props.onVariantChange}
    />
  );
}

export { FloorPlanResultView };
export type { FloorPlanResultViewProps } from "./FloorPlanResultView";
