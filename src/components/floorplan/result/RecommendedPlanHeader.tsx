import { conceptualReviewBadge, recommendedPlanPageTitle } from "@/lib/floorplan-result/copy";

type Props = {
  isShowingRecommended: boolean;
  projectTitle: string;
  variantLabel: string;
};

export function RecommendedPlanHeader({
  isShowingRecommended,
  projectTitle,
  variantLabel,
}: Props) {
  return (
    <header className="space-y-2 sm:space-y-3" data-testid="recommended-plan-header">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            {recommendedPlanPageTitle(isShowingRecommended)}
          </h1>
          <p className="text-lg font-medium text-stone-800 sm:text-xl">
            {variantLabel}
          </p>
          <p className="text-sm text-stone-500">{projectTitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isShowingRecommended && (
            <span className="inline-flex rounded-full bg-stone-900 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Recomendada
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-950 ring-1 ring-amber-200/80">
            {conceptualReviewBadge()}
          </span>
        </div>
      </div>
    </header>
  );
}
