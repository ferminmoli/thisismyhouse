import type {
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
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
        label: "Confianza media-baja",
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

export {
  resolveInitialVariantId,
  resolveSelectedVariant,
  getSelectableVariants,
  stableVariantId,
} from "./selection";

export function variantBenefitLine(variant: PublicFloorPlanVariant): string {
  if (variant.description?.trim()) return variant.description.trim();
  if (variant.highlights[0]) return variant.highlights[0];
  return "Variante conceptual para comparar con el concepto recomendado.";
}

/** User-facing quality tag (not raw score). */
export function variantQualityTag(
  variant: PublicFloorPlanVariant,
  options: { isRecommended: boolean; index: number },
): string {
  if (options.isRecommended) return "Recomendada";
  if (options.index === 1) return "Muy buena alternativa";

  const label = variant.label.toLowerCase();
  if (label.includes("patio")) return "Más patio";
  if (label.includes("cocina") || label.includes("integrad")) {
    return "Más cocina integrada";
  }
  if (label.includes("social") || label.includes("estar")) return "Más social";
  if (label.includes("lavadero") || label.includes("laundry")) {
    return "Más servicio";
  }
  return `Alternativa ${variant.rank ?? options.index + 1}`;
}

export function isRecommendedVariant(
  variant: PublicFloorPlanVariant,
  publicResult: PublicFloorPlanResult,
): boolean {
  return variant.id === publicResult.recommendedVariant.id;
}

/** Detects leaked internal scorer fields in serialized public UI. */
export function containsInternalScoreLeak(htmlOrText: string): boolean {
  const forbidden = [
    "penalties",
    "mutationintentscore",
    "adjacencyscore",
    "daylightscore",
    "invalidadjacency",
    "scoringdetails",
    "hardadjacencychecks",
    "doorcontactchecks",
    "developer debug",
    "scoredvariants",
    "validation object",
    "raw scorer",
  ];
  const lower = htmlOrText.toLowerCase();
  return forbidden.some((f) => lower.includes(f));
}
