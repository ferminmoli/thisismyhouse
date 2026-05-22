"use client";

import type { PublicFloorPlanVariant } from "@/lib/architecture/floorPlanPipelineTypes";
import { useId } from "react";
import { VariantCard } from "./VariantCard";

type Props = {
  variants: PublicFloorPlanVariant[];
  recommendedVariant: PublicFloorPlanVariant;
  selectedVariantId: string;
  onSelectVariant: (variantId: string) => void;
  showScores?: boolean;
};

export function VariantSelector({
  variants,
  recommendedVariant,
  selectedVariantId,
  onSelectVariant,
  showScores = false,
}: Props) {
  const list = variants.slice(0, 3);
  const panelId = useId();

  if (list.length === 0) return null;

  return (
    <section aria-label="Variantes principales">
      <h2 className="text-sm font-medium text-stone-700">
        Otras variantes
      </h2>
      <p className="mt-0.5 text-xs text-stone-500">
        La recomendada va primero. Elegí otra para actualizar el plano.
      </p>
      <div
        className="mt-4 -mx-1 flex gap-3 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0"
        role="tablist"
        aria-label="Selector de variantes del plano"
      >
        {list.map((v, index) => {
          const tabId = `${panelId}-tab-${v.id}`;
          return (
            <div
              key={v.id}
              className="min-w-[min(86vw,248px)] shrink-0 snap-start sm:min-w-0"
            >
              <VariantCard
                variant={v}
                selected={selectedVariantId === v.id}
                isRecommended={v.id === recommendedVariant.id}
                listIndex={index}
                tabId={tabId}
                panelId={panelId}
                onSelect={() => onSelectVariant(v.id)}
                showScore={showScores}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
