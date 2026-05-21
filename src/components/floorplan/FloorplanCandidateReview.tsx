"use client";

import type { CandidateReview } from "@/lib/ai-prompts/candidate-critic-types";

type Props = {
  review: CandidateReview;
};

export function FloorplanCandidateReview({ review }: Props) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white/95 px-5 py-4 text-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
        Crítica de esta opción
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-600 sm:grid-cols-4">
        <div>
          <span className="block text-stone-400">Encaje brief</span>
          <span className="font-semibold tabular-nums text-stone-800">
            {review.briefFitScore}%
          </span>
        </div>
        <div>
          <span className="block text-stone-400">Habitabilidad</span>
          <span className="font-semibold tabular-nums text-stone-800">
            {review.livabilityScore}%
          </span>
        </div>
        <div>
          <span className="block text-stone-400">Privacidad</span>
          <span className="font-semibold tabular-nums text-stone-800">
            {review.privacyScore}%
          </span>
        </div>
        <div>
          <span className="block text-stone-400">Social / patio</span>
          <span className="font-semibold tabular-nums text-stone-800">
            {review.socialOutdoorScore}%
          </span>
        </div>
      </div>
      <p className="mt-4 text-stone-800">
        <span className="font-medium text-emerald-800">Fortaleza:</span>{" "}
        {review.mainStrength}
      </p>
      <p className="mt-2 text-stone-600">
        <span className="font-medium text-amber-800">Riesgo:</span>{" "}
        {review.mainRisk}
      </p>
      <p className="mt-2 text-stone-600">
        <span className="font-medium text-stone-700">Ideal si:</span>{" "}
        {review.bestFor}
      </p>
    </div>
  );
}
