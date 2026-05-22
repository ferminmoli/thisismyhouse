import type {
  PublicFloorPlanResult,
  PublicVariantSummary,
  SvgPlanRender,
} from "@/lib/architecture/floorPlanPipelineTypes";
import type { PublicConfidence } from "@/lib/architecture/floorPlanPipelineTypes";

export type ConfidenceLevel = PublicConfidence["level"];

export function confidenceBadge(level: ConfidenceLevel): {
  label: string;
  className: string;
} {
  switch (level) {
    case "high":
      return {
        label: "Alta confianza",
        className: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
      };
    case "medium":
      return {
        label: "Confianza media",
        className: "bg-sky-50 text-sky-900 ring-sky-200/80",
      };
    case "medium_low":
      return {
        label: "Confianza conceptual",
        className: "bg-amber-50 text-amber-950 ring-amber-200/80",
      };
    case "low":
    default:
      return {
        label: "Faltan datos del terreno",
        className: "bg-stone-100 text-stone-700 ring-stone-200/80",
      };
  }
}

export function findSvgForVariant(
  svgPlans: SvgPlanRender[],
  variantId: string,
  variantLabel?: string,
): SvgPlanRender | undefined {
  return (
    svgPlans.find((s) => s.variantId === variantId) ??
    (variantLabel
      ? svgPlans.find((s) => s.variantLabel === variantLabel)
      : undefined)
  );
}

export function resolveInitialVariantId(
  publicResult: PublicFloorPlanResult,
): string {
  if (publicResult.recommendedVariantId) {
    const hasSvg = findSvgForVariant(
      publicResult.svgPlans,
      publicResult.recommendedVariantId,
      publicResult.recommendedVariantLabel,
    );
    const inTop = publicResult.topVariants.some(
      (v) => v.variantId === publicResult.recommendedVariantId,
    );
    if (hasSvg || inTop) return publicResult.recommendedVariantId;
  }
  return publicResult.topVariants[0]?.variantId ?? "";
}

export function variantBenefitLine(variant: PublicVariantSummary): string {
  if (variant.highlights[0]) return variant.highlights[0];
  if (variant.summary) return variant.summary;
  return "Variante conceptual para comparar con el concepto recomendado.";
}

export function isRecommendedVariant(
  variant: PublicVariantSummary,
  publicResult: PublicFloorPlanResult,
): boolean {
  return (
    variant.variantId === publicResult.recommendedVariantId ||
    variant.label === publicResult.recommendedVariantLabel
  );
}

/** Detects leaked internal scorer fields in serialized public UI. */
export function containsInternalScoreLeak(htmlOrText: string): boolean {
  const forbidden = [
    "penalties",
    "mutationIntentScore",
    "adjacencyScore",
    "invalidAdjacency",
    "scoringDetails",
    "totalScore",
  ];
  const lower = htmlOrText.toLowerCase();
  return forbidden.some((f) => lower.includes(f.toLowerCase()));
}
