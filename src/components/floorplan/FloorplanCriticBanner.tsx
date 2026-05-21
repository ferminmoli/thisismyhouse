"use client";

import type { CandidateCriticOutput } from "@/lib/ai-prompts/candidate-critic-types";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";

type Props = {
  critic: CandidateCriticOutput;
  criticSource: "gemini" | "local";
  variations: LayoutVariation[];
  selectedIndex: number;
  onSelectRecommended: () => void;
};

export function FloorplanCriticBanner({
  critic,
  criticSource,
  variations,
  selectedIndex,
  onSelectRecommended,
}: Props) {
  const recIndex = variations.findIndex(
    (v) => v.optionId === critic.recommendedCandidateId,
  );
  if (recIndex < 0) return null;

  const rec = variations[recIndex];
  const alreadySelected = selectedIndex === recIndex;

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-white px-5 py-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-700/80">
        Recomendación conceptual
        {criticSource === "local" && (
          <span className="ml-2 normal-case tracking-normal text-stone-500">
            · ranking local
          </span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700">
        <span className="font-semibold text-stone-900">{rec.label}</span>
        {" — "}
        {critic.recommendationReason}
      </p>
      {!alreadySelected && (
        <button
          type="button"
          onClick={onSelectRecommended}
          className="mt-3 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-900"
        >
          Ver {rec.label}
        </button>
      )}
    </div>
  );
}
