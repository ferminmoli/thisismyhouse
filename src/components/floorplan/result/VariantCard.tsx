import type { PublicFloorPlanVariant } from "@/lib/architecture/floorPlanPipelineTypes";
import {
  variantBenefitLine,
  variantQualityTag,
} from "@/lib/floorplan-result/utils";

type Props = {
  variant: PublicFloorPlanVariant;
  selected: boolean;
  isRecommended: boolean;
  listIndex: number;
  tabId: string;
  panelId: string;
  onSelect: () => void;
  showScore?: boolean;
};

export function VariantCard({
  variant,
  selected,
  isRecommended,
  listIndex,
  tabId,
  panelId,
  onSelect,
  showScore = false,
}: Props) {
  const qualityTag = variantQualityTag(variant, {
    isRecommended,
    index: listIndex,
  });

  return (
    <button
      type="button"
      id={tabId}
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      onClick={onSelect}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 ${
        selected
          ? "border-stone-800 bg-stone-900 text-white shadow-md shadow-stone-900/12"
          : "border-stone-200/90 bg-white text-stone-800 hover:border-stone-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            selected ? "text-stone-300" : "text-stone-500"
          }`}
        >
          {qualityTag}
        </span>
        {showScore && variant.score != null && (
          <span
            className="text-[10px] tabular-nums text-stone-400"
            data-testid="variant-debug-score"
          >
            {Math.round(variant.score)}
          </span>
        )}
      </div>
      <p
        className={`mt-2 text-sm font-semibold leading-snug ${
          selected ? "text-white" : "text-stone-900"
        }`}
      >
        {variant.label}
      </p>
      <p
        className={`mt-1.5 line-clamp-3 text-xs leading-relaxed ${
          selected ? "text-stone-300" : "text-stone-600"
        }`}
      >
        {variantBenefitLine(variant)}
      </p>
    </button>
  );
}
