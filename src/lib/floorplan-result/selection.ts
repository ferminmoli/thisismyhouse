import type {
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
} from "@/lib/architecture/floorPlanPipelineTypes";

export function stableVariantId(variant: PublicFloorPlanVariant): string {
  return (
    variant.id ||
    variant.plan.id ||
    variant.label.trim().toLowerCase().replace(/\s+/g, "_")
  );
}

/** Top 3 public variants; ensures recommended is present. */
export function getSelectableVariants(
  publicResult: PublicFloorPlanResult,
): PublicFloorPlanVariant[] {
  const recommended = {
    ...publicResult.recommendedVariant,
    id: stableVariantId(publicResult.recommendedVariant),
  };
  const top = (publicResult.topVariants ?? []).map((v) => ({
    ...v,
    id: stableVariantId(v),
  }));

  if (top.length === 0) return [recommended];

  const merged = top.some((v) => v.id === recommended.id)
    ? top
    : [recommended, ...top];

  const seen = new Set<string>();
  const ordered: PublicFloorPlanVariant[] = [];
  for (const v of [recommended, ...merged]) {
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    ordered.push(v);
    if (ordered.length >= 3) break;
  }
  return ordered;
}

/** 1. recommendedVariant · 2. topVariants[0] · null if none */
export function resolveRecommendedVariant(
  publicResult: PublicFloorPlanResult,
): PublicFloorPlanVariant | null {
  const rec = publicResult.recommendedVariant;
  if (rec?.plan?.zones?.length) {
    return { ...rec, id: stableVariantId(rec) };
  }
  const first = publicResult.topVariants?.[0];
  if (first?.plan?.zones?.length) {
    return { ...first, id: stableVariantId(first) };
  }
  return null;
}

export function resolveInitialVariantId(
  publicResult: PublicFloorPlanResult,
): string {
  const rec = resolveRecommendedVariant(publicResult);
  if (rec) return rec.id;
  const first = publicResult.topVariants?.[0];
  return first ? stableVariantId(first) : "";
}

export function resolveSelectedVariant(
  publicResult: PublicFloorPlanResult,
  selectedVariantId: string,
): PublicFloorPlanVariant {
  const recommended = resolveRecommendedVariant(publicResult);
  const variants = getSelectableVariants(publicResult);
  const found = variants.find((v) => v.id === selectedVariantId);
  if (found) return found;
  if (recommended) return recommended;
  return variants[0]!;
}

export function warnVariantMismatch(
  recommended: PublicFloorPlanVariant,
  selected: PublicFloorPlanVariant,
  userHasSelected: boolean,
  isDev: boolean,
): void {
  if (!isDev || userHasSelected) return;
  if (recommended.id !== selected.id || recommended.label !== selected.label) {
    console.warn(
      "[FloorPlanResultView] Default selection is not the recommended variant",
      {
        recommendedId: recommended.id,
        recommendedLabel: recommended.label,
        selectedId: selected.id,
        selectedLabel: selected.label,
      },
    );
  }
}
