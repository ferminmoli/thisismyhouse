"use client";

import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";

type Props = {
  variations: LayoutVariation[];
  selectedIndex: number;
  recommendedOptionId?: string;
  onSelect: (index: number) => void;
};

function scorePct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function FloorplanVariationPicker({
  variations,
  selectedIndex,
  recommendedOptionId,
  onSelect,
}: Props) {
  if (variations.length <= 1) return null;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
        Conceptos generados
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Elegí la distribución que mejor encaje con tu brief.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {variations.map((v, i) => {
          const active = i === selectedIndex;
          const recommended =
            recommendedOptionId != null && v.optionId === recommendedOptionId;
          return (
            <button
              key={v.optionId}
              type="button"
              onClick={() => onSelect(i)}
              className={`relative min-w-[7rem] rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-stone-800 bg-stone-900 text-white shadow-md"
                  : recommended
                    ? "border-emerald-400 bg-emerald-50/80 text-stone-800 hover:border-emerald-500"
                    : "border-stone-200 bg-stone-50/80 text-stone-800 hover:border-stone-300 hover:bg-white"
              }`}
            >
              {recommended && (
                <span
                  className={`absolute -right-1 -top-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                    active
                      ? "bg-emerald-400 text-stone-900"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  Top
                </span>
              )}
              <span className="block text-sm font-semibold">{v.label}</span>
              <span
                className={`mt-0.5 block text-xs ${
                  active ? "text-stone-300" : "text-stone-500"
                }`}
              >
                {v.description}
              </span>
              <span
                className={`mt-2 block text-[10px] tabular-nums ${
                  active ? "text-stone-400" : "text-stone-400"
                }`}
              >
                Calidad {scorePct(v.scores.compositeScore)}
                {v.repaired && " · ajustada"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
