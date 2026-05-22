import { confidenceBadge } from "@/lib/floorplan-result/utils";
import type { PublicConfidence } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  confidence: PublicConfidence;
  requiredProfessionalReview: string[];
};

export function ConfidenceReviewCard({
  confidence,
  requiredProfessionalReview,
}: Props) {
  const badge = confidenceBadge(confidence.level);

  return (
    <section
      className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-white p-5 shadow-sm"
      aria-labelledby="professional-review-title"
    >
      <div className="flex gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg"
          aria-hidden
        >
          🛡
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="professional-review-title"
            className="text-sm font-semibold text-amber-950"
          >
            Revisión profesional necesaria
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
            Arc generó un layout conceptual según tu pedido. Antes de usarlo
            para diseño u obra, un profesional debe validar lo siguiente.
          </p>
          <span
            className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {confidence.reasons.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-amber-100/80 pt-4">
          {confidence.reasons.map((r, i) => (
            <li key={i} className="text-xs leading-relaxed text-amber-950/85">
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
              className="rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700 ring-1 ring-amber-100"
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
