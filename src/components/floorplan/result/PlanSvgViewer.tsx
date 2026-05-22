import type { SvgLegendItem, SvgPlanRender } from "@/lib/architecture/floorPlanPipelineTypes";

type Props = {
  render: SvgPlanRender | null;
  variantLabel: string;
  fallbackMessage?: string;
};

export function PlanSvgViewer({
  render,
  variantLabel,
  fallbackMessage = "La vista del plano no está disponible, pero el resumen del concepto sí.",
}: Props) {
  if (!render?.svg) {
    return (
      <div
        className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center"
        role="img"
        aria-label="Vista del plano no disponible"
      >
        <p className="text-sm font-medium text-slate-700">Vista conceptual</p>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{fallbackMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/50">
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Planta conceptual
        </p>
        <p className="text-sm font-medium text-slate-800">{variantLabel}</p>
      </div>
      <div
        className="aspect-square w-full max-h-[min(72vh,640px)] bg-[#FAFAF8] p-3 sm:p-5"
        role="img"
        aria-label={`Plano conceptual: ${variantLabel}`}
      >
        <div
          className="h-full w-full [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:object-contain"
          dangerouslySetInnerHTML={{ __html: render.svg }}
        />
      </div>
      {render.legend.length > 0 && (
        <LegendRow items={render.legend} />
      )}
    </div>
  );
}

function LegendRow({ items }: { items: SvgLegendItem[] }) {
  return (
    <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-3">
      {items.slice(0, 5).map((item) => (
        <span
          key={item.key}
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm ring-1 ring-slate-200"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
