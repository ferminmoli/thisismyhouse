import { confidenceBadge } from "@/lib/floorplan-result/utils";
import type { PublicConfidence } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  confidence: PublicConfidence;
  requiredProfessionalReview: string[];
  disclaimer?: string;
};

export function ConfidenceReviewCard({
  confidence,
  requiredProfessionalReview,
  disclaimer,
}: Props) {
  const badge = confidenceBadge(confidence.level);

  return (
    <section
      className="rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 to-white p-5 shadow-sm shadow-amber-100/30"
      aria-labelledby="professional-review-title"
      data-testid="confidence-review-card"
    >
      <div className="flex gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100/90 text-sm font-semibold text-amber-900"
          aria-hidden
        >
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="professional-review-title"
            className="text-sm font-semibold text-amber-950"
          >
            Revisión profesional necesaria
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-950/90">
            <span className="font-medium">{badge.label}</span>
            {" · "}
            Esta propuesta es conceptual: prepara la conversación con un
            arquitecto, no reemplaza su trabajo ni certifica factibilidad de obra.
          </p>
        </div>
      </div>

      {confidence.reasons.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-amber-100/80 pt-4">
          {confidence.reasons.map((r, i) => (
            <li
              key={i}
              className="flex gap-2 text-xs leading-relaxed text-amber-950/85"
            >
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500/70" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      )}

      {requiredProfessionalReview.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {requiredProfessionalReview.map((item, i) => (
            <li
              key={i}
              className="rounded-lg bg-white/80 px-3 py-2 text-xs text-stone-700 ring-1 ring-amber-100/90"
            >
              {item}
            </li>
          ))}
        </ul>
      )}

      {disclaimer && (
        <p className="mt-4 border-t border-amber-100/80 pt-3 text-[11px] leading-relaxed text-stone-600">
          {disclaimer}
        </p>
      )}
    </section>
  );
}
