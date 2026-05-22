import { confidenceBadge } from "@/lib/floorplan-result/utils";
import { professionalReviewWarning } from "@/lib/floorplan-result/copy";
import type { PublicConfidence } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  pageTitle: string;
  projectTitle: string;
  variantLabel: string;
  summary: string;
  confidence: PublicConfidence;
  showRecommendedBadge?: boolean;
};

export function ConceptualPlanHero({
  pageTitle,
  projectTitle,
  variantLabel,
  summary,
  confidence,
  showRecommendedBadge = true,
}: Props) {
  const badge = confidenceBadge(confidence.level);

  return (
    <header className="space-y-3 sm:space-y-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">
        Planta conceptual
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl lg:text-3xl">
            {pageTitle}
          </h1>
          <p className="text-base font-medium text-stone-800 sm:text-lg">
            {variantLabel}
          </p>
          <p className="text-sm text-stone-500">{projectTitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {showRecommendedBadge && (
            <span className="inline-flex rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Recomendada
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
      </div>
      <p className="hidden max-w-3xl text-base leading-relaxed text-stone-700 sm:block">
        {summary}
      </p>
      <p
        className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2.5 text-xs leading-relaxed text-amber-950 sm:text-sm"
        role="note"
      >
        {professionalReviewWarning()}
      </p>
    </header>
  );
}
