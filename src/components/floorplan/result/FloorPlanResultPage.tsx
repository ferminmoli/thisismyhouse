"use client";

import type {
  FloorPlanDebugPayload,
  PublicFloorPlanResult,
} from "@/lib/architecture/floorPlanPipelineTypes";
import {
  findSvgForVariant,
  resolveInitialVariantId,
} from "@/lib/floorplan-result/utils";
import { shouldShowFloorPlanDebug } from "@/lib/floorplan-result/featureFlags";
import { useEffect, useMemo, useState } from "react";
import { RecommendedPlanHeader } from "./RecommendedPlanHeader";
import { PlanSvgViewer } from "./PlanSvgViewer";
import { VariantSelector } from "./VariantSelector";
import { WhyRecommended } from "./WhyRecommended";
import { ConfidenceReviewCard } from "./ConfidenceReviewCard";
import { ArchitectBriefAccordion } from "./ArchitectBriefAccordion";
import { VisualInspirationCard } from "./VisualInspirationCard";
import { FloorPlanResultDebugPanel } from "./FloorPlanResultDebugPanel";
import { FloorPlanResultEmptyState } from "./EmptyState";
import { FloorPlanResultLoadingState } from "./LoadingState";
import { FloorPlanResultErrorState } from "./ErrorState";

export type FloorPlanResultPageProps = {
  publicResult: PublicFloorPlanResult | null;
  debug?: FloorPlanDebugPayload | null;
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  isDev?: boolean;
  onVariantChange?: (variantId: string) => void;
};

export function FloorPlanResultPage({
  publicResult,
  debug = null,
  loading = false,
  error = null,
  isAdmin = false,
  isDev = false,
  onVariantChange,
}: FloorPlanResultPageProps) {
  const showDebug = shouldShowFloorPlanDebug({ isAdmin, isDev });
  const initialId = publicResult ? resolveInitialVariantId(publicResult) : "";
  const [selectedVariantId, setSelectedVariantId] = useState(initialId);

  useEffect(() => {
    if (publicResult) {
      const id = resolveInitialVariantId(publicResult);
      setSelectedVariantId(id);
      onVariantChange?.(id);
    }
  }, [publicResult?.recommendedVariantId, publicResult?.topVariants.length]);

  const handleSelectVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    onVariantChange?.(variantId);
  };

  const activeVariant = useMemo(() => {
    if (!publicResult) return null;
    return (
      publicResult.topVariants.find((v) => v.variantId === selectedVariantId) ??
      publicResult.topVariants[0] ??
      null
    );
  }, [publicResult, selectedVariantId]);

  const activeSvg = useMemo(() => {
    if (!publicResult || !activeVariant) return null;
    return (
      findSvgForVariant(
        publicResult.svgPlans,
        activeVariant.variantId,
        activeVariant.label,
      ) ?? null
    );
  }, [publicResult, activeVariant]);

  const displayLabel =
    activeVariant?.label ?? publicResult?.recommendedVariantLabel ?? "";
  const displayWhy =
    selectedVariantId === publicResult?.recommendedVariantId
      ? publicResult?.whyRecommended ?? []
      : activeVariant?.highlights.length
        ? activeVariant.highlights
        : publicResult?.whyRecommended ?? [];

  if (loading) {
    return <FloorPlanResultLoadingState />;
  }

  if (error) {
    return (
      <FloorPlanResultErrorState
        message={error}
        technicalDetail={debug ? JSON.stringify(debug.warnings) : undefined}
        showTechnical={showDebug}
      />
    );
  }

  if (!publicResult) {
    return <FloorPlanResultEmptyState />;
  }

  return (
    <div className="space-y-8" data-testid="floor-plan-result-page">
      <RecommendedPlanHeader
        title={publicResult.title}
        variantLabel={displayLabel}
        summary={publicResult.summary}
        confidence={publicResult.confidence}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] lg:items-start">
        <div className="space-y-6 min-w-0">
          <PlanSvgViewer render={activeSvg} variantLabel={displayLabel} />
          <VariantSelector
            publicResult={publicResult}
            selectedVariantId={selectedVariantId || initialId}
            onSelectVariant={handleSelectVariant}
          />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <WhyRecommended reasons={displayWhy} />
          <ConfidenceReviewCard
            confidence={publicResult.confidence}
            requiredProfessionalReview={publicResult.requiredProfessionalReview}
          />
          {publicResult.disclaimers[0] && (
            <p className="text-[11px] leading-relaxed text-slate-500">
              {publicResult.disclaimers.join(" ")}
            </p>
          )}
        </aside>
      </div>

      <ArchitectBriefAccordion brief={publicResult.architectBrief} />
      <VisualInspirationCard inspiration={publicResult.visualInspiration} />

      {showDebug && debug && <FloorPlanResultDebugPanel debug={debug} />}
    </div>
  );
}
