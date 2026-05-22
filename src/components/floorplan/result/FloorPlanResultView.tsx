"use client";

import type { PresentedFloorPlanResult } from "@/lib/architecture/publicFloorPlanTypes";
import {
  buildWhyNarrative,
  professionalReviewWarning,
  whySectionTitle,
} from "@/lib/floorplan-result/copy";
import {
  getSelectableVariants,
  resolveInitialVariantId,
  resolveRecommendedVariant,
  resolveSelectedVariant,
  warnVariantMismatch,
} from "@/lib/floorplan-result/selection";
import {
  isWallGraphDebugEnabled,
  shouldShowFloorPlanDebug,
} from "@/lib/floorplan-result/featureFlags";
import { useEffect, useMemo, useRef, useState } from "react";
import { RecommendedPlanHeader } from "./RecommendedPlanHeader";
import { FinalPlanRenderer } from "./FinalPlanRenderer";
import { VariantSelector } from "./VariantSelector";
import { WhyRecommended } from "./WhyRecommended";
import { ArchitectBriefAccordion } from "./ArchitectBriefAccordion";
import { VisualInspirationCard } from "./VisualInspirationCard";
import { FloorPlanResultDebugPanel } from "./FloorPlanResultDebugPanel";
import { FloorPlanResultEmptyState } from "./EmptyState";
import { FloorPlanResultLoadingState } from "./LoadingState";
import { FloorPlanResultErrorState } from "./ErrorState";

const MAX_WHY_BULLETS = 5;

export type FloorPlanResultViewProps = {
  result: PresentedFloorPlanResult | null;
  loading?: boolean;
  error?: string | null;
  isAdmin?: boolean;
  isDev?: boolean;
  onVariantChange?: (variantId: string) => void;
};

export function FloorPlanResultView({
  result,
  loading = false,
  error = null,
  isAdmin = false,
  isDev = false,
  onVariantChange,
}: FloorPlanResultViewProps) {
  const showDebug = shouldShowFloorPlanDebug({ isAdmin, isDev });
  const [wallGraphDebug, setWallGraphDebug] = useState(false);
  const wallGraphActive = isWallGraphDebugEnabled({
    isAdmin,
    isDev,
    wallGraphDebug,
  });
  const publicResult = result?.publicResult ?? null;
  const debug = result?.debug;

  const recommendedVariant = useMemo(
    () => (publicResult ? resolveRecommendedVariant(publicResult) : null),
    [publicResult],
  );

  const selectableVariants = useMemo(
    () => (publicResult ? getSelectableVariants(publicResult) : []),
    [publicResult],
  );

  const recommendedId = recommendedVariant?.id ?? "";
  const [selectedVariantId, setSelectedVariantId] = useState(recommendedId);
  const userPickedRef = useRef(false);

  useEffect(() => {
    if (!publicResult || !recommendedVariant) return;
    const nextId = resolveInitialVariantId(publicResult);
    setSelectedVariantId(nextId);
    userPickedRef.current = false;
    onVariantChange?.(nextId);
  }, [
    publicResult?.title,
    publicResult?.recommendedVariant?.id,
    recommendedId,
  ]);

  const selectedVariant = useMemo(() => {
    if (!publicResult || !recommendedVariant) return null;
    return resolveSelectedVariant(publicResult, selectedVariantId);
  }, [publicResult, recommendedVariant, selectedVariantId]);

  useEffect(() => {
    if (!recommendedVariant || !selectedVariant) return;
    warnVariantMismatch(
      recommendedVariant,
      selectedVariant,
      userPickedRef.current,
      isDev || isAdmin,
    );
  }, [recommendedVariant, selectedVariant, isDev, isAdmin]);

  const handleSelectVariant = (variantId: string) => {
    userPickedRef.current = true;
    setSelectedVariantId(variantId);
    onVariantChange?.(variantId);
  };

  const isShowingRecommended =
    recommendedVariant != null &&
    selectedVariant != null &&
    selectedVariant.id === recommendedVariant.id;

  const whyContent = useMemo(() => {
    if (!publicResult || !selectedVariant) {
      return { narrative: "", bullets: [] as string[] };
    }
    const built = buildWhyNarrative(
      publicResult,
      selectedVariant,
      isShowingRecommended,
    );
    return {
      narrative: built.narrative,
      bullets: built.bullets.slice(0, MAX_WHY_BULLETS),
    };
  }, [publicResult, selectedVariant, isShowingRecommended]);

  if (loading) {
    return <FloorPlanResultLoadingState />;
  }

  if (error) {
    return (
      <FloorPlanResultErrorState
        message={error}
        technicalDetail={
          showDebug && debug?.warnings
            ? JSON.stringify(debug.warnings)
            : undefined
        }
        showTechnical={showDebug}
      />
    );
  }

  if (
    !publicResult ||
    !recommendedVariant ||
    !selectedVariant ||
    selectableVariants.length === 0 ||
    !selectedVariant.plan?.zones?.length
  ) {
    return <FloorPlanResultEmptyState />;
  }

  const hasPlan = selectedVariant.plan.zones.length > 0;

  return (
    <article
      className="max-w-full space-y-6 overflow-x-hidden sm:space-y-8"
      data-testid="floor-plan-result-view"
    >
      <RecommendedPlanHeader
        isShowingRecommended={isShowingRecommended}
        projectTitle={publicResult.title}
        variantLabel={selectedVariant.label}
      />

      {hasPlan ? (
        <section aria-label="Plano final" className="w-full">
          <FinalPlanRenderer
            key={`${selectedVariant.id}-${wallGraphActive ? "wg" : "pub"}`}
            plan={selectedVariant.plan}
            title={publicResult.title}
            variantLabel={selectedVariant.label}
            variantId={selectedVariant.id}
            wallGraphDebug={wallGraphActive}
          />
        </section>
      ) : (
        <FloorPlanResultEmptyState message="No hay geometría de planta para mostrar en esta variante." />
      )}

      <VariantSelector
        variants={selectableVariants}
        recommendedVariant={recommendedVariant}
        selectedVariantId={selectedVariantId}
        onSelectVariant={handleSelectVariant}
        showScores={showDebug}
      />

      <section className="max-w-3xl space-y-5 border-t border-stone-200/80 pt-6">
        <WhyRecommended
          title={whySectionTitle(isShowingRecommended)}
          narrative={whyContent.narrative}
          bullets={whyContent.bullets}
          compact
        />

        <p
          className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-amber-950 sm:text-sm"
          role="note"
          data-testid="professional-review-warning"
        >
          {professionalReviewWarning()}
        </p>
      </section>

      <ArchitectBriefAccordion
        brief={publicResult.architectBrief}
        selectedVariantLabel={selectedVariant.label}
        professionalChecks={publicResult.professionalReview.items}
        defaultOpen={false}
      />

      {publicResult.visualInspiration ? (
        <VisualInspirationCard inspiration={publicResult.visualInspiration} />
      ) : null}

      {showDebug && debug ? (
        <FloorPlanResultDebugPanel
          debug={debug}
          plan={selectedVariant.plan}
          title={publicResult.title}
          variantLabel={selectedVariant.label}
          variantId={selectedVariant.id}
          wallGraphDebug={wallGraphDebug}
          onWallGraphDebugChange={setWallGraphDebug}
        />
      ) : null}
    </article>
  );
}
