import type { PublicVisualInspiration } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  inspiration?: PublicVisualInspiration;
};

export function VisualInspirationCard({ inspiration }: Props) {
  if (!inspiration?.prompt?.trim()) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm"
      aria-labelledby="visual-inspiration-title"
      data-testid="visual-inspiration-card"
    >
      <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.35fr)]">
        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">
            Dirección de ambiente
          </p>
          <h2
            id="visual-inspiration-title"
            className="mt-1 text-sm font-semibold text-stone-900"
          >
            Inspiración visual
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Referencia de estilo y sensación — no es un render final ni un plano
            de obra.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone-700">
            {inspiration.prompt}
          </p>
          {inspiration.notes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {inspiration.notes.map((note, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-xs leading-relaxed text-stone-600"
                >
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-stone-400"
                    aria-hidden
                  />
                  {note}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className="relative min-h-[120px] bg-gradient-to-br from-amber-50/90 via-stone-100 to-emerald-50/80 sm:min-h-full"
          aria-hidden
        >
          <div className="absolute inset-4 rounded-xl border border-white/60 bg-white/20 backdrop-blur-[2px]" />
          <div className="absolute bottom-5 left-5 right-5 space-y-1">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-stone-600/90">
              Sensación buscada
            </span>
            <span className="block text-xs text-stone-700/90">
              Luz natural · materiales cálidos
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
