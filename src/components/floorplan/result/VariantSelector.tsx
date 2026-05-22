"use client";

import type { PublicFloorPlanResult } from "@/lib/architecture/floorPlanPipelineTypes";
import { isRecommendedVariant } from "@/lib/floorplan-result/utils";
import { VariantCard } from "./VariantCard";

type Props = {
  publicResult: PublicFloorPlanResult;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
};

export function VariantSelector({
  publicResult,
  selectedVariantId,
  onSelectVariant,
}: Props) {
  const variants = publicResult.topVariants.slice(0, 3);

  if (variants.length === 0) return null;

  return (
    <section aria-label="Variantes principales">
      <h2 className="text-sm font-semibold text-slate-900">
        Tres conceptos para comparar
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Elegí otra opción para ver cómo cambia la planta y la explicación.
      </p>
      <div
        className="mt-4 grid gap-3 sm:grid-cols-3"
        role="group"
        aria-label="Selector de variantes"
      >
        {variants.map((v) => (
          <VariantCard
            key={v.variantId}
            variant={v}
            selected={selectedVariantId === v.variantId}
            isRecommended={isRecommendedVariant(v, publicResult)}
            onSelect={() => onSelectVariant(v.variantId)}
          />
        ))}
      </div>
    </section>
  );
}
