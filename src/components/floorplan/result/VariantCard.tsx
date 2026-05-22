import type { PublicVariantSummary } from "@/lib/architecture/floorPlanPipelineTypes";
import { variantBenefitLine } from "@/lib/floorplan-result/utils";

type Props = {
  variant: PublicVariantSummary;
  selected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
};

export function VariantCard({
  variant,
  selected,
  isRecommended,
  onSelect,
}: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl border px-4 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
        selected
          ? "border-slate-800 bg-slate-900 text-white shadow-md shadow-slate-900/15"
          : "border-slate-200/90 bg-white text-slate-800 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            selected ? "text-slate-300" : "text-slate-500"
          }`}
        >
          {isRecommended ? "Recomendada" : `Opción ${variant.rank}`}
        </span>
      </div>
      <p
        className={`mt-2 text-sm font-semibold leading-snug ${
          selected ? "text-white" : "text-slate-900"
        }`}
      >
        {variant.label}
      </p>
      <p
        className={`mt-2 text-xs leading-relaxed ${
          selected ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {variantBenefitLine(variant)}
      </p>
    </button>
  );
}
