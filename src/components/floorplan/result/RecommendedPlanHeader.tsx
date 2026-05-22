import { confidenceBadge } from "@/lib/floorplan-result/utils";
import type { PublicConfidence } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  title: string;
  variantLabel: string;
  summary: string;
  confidence: PublicConfidence;
};

export function RecommendedPlanHeader({
  title,
  variantLabel,
  summary,
  confidence,
}: Props) {
  const badge = confidenceBadge(confidence.level);

  return (
    <header className="space-y-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
        Concepto recomendado
      </p>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {variantLabel}
          </h1>
          <p className="text-sm text-slate-600">{title}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="max-w-3xl text-base leading-relaxed text-slate-700">
        {summary}
      </p>
      <p className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
        <span className="font-medium text-slate-800">Vista conceptual.</span>{" "}
        No es un plano técnico definitivo. Un profesional matriculado debe
        validar medidas, orientación, estructura, instalaciones y normativa local
        antes de proyectar o construir.
      </p>
    </header>
  );
}
