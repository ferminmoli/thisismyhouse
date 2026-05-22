import type { VisualInspirationPrompt } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  inspiration: VisualInspirationPrompt;
};

export function VisualInspirationCard({ inspiration }: Props) {
  if (!inspiration.prompt) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5">
      <h2 className="text-sm font-semibold text-slate-800">
        Inspiración visual
      </h2>
      <p className="mt-1 text-xs text-slate-500">
        Referencia de ambiente y estilo — no es un plano técnico ni un documento
        de obra.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        {inspiration.prompt}
      </p>
      {inspiration.styleTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {inspiration.styleTags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">{inspiration.safetyNote}</p>
    </section>
  );
}
