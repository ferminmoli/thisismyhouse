import type { SvgPlanRender } from "@/lib/architecture/floorPlanPipelineTypes";
import { PUBLIC_SVG_DISCLAIMER } from "@/lib/architecture/svgRenderer";

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
        className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-6 py-12 text-center"
        role="img"
        aria-label="Vista del plano no disponible"
      >
        <p className="text-sm font-medium text-stone-700">Vista conceptual</p>
        <p className="mt-2 max-w-sm text-sm text-stone-500">{fallbackMessage}</p>
      </div>
    );
  }

  const [, , viewW, viewH] = render.viewBox.split(" ").map(Number);
  const aspect = viewW > 0 && viewH > 0 ? viewW / viewH : 100 / 114;

  return (
    <figure className="w-full min-w-0 max-w-full" data-testid="premium-plan-svg-viewer">
      <div
        className="overflow-hidden rounded-2xl border border-stone-200/70 bg-[#F6F4F0] shadow-[0_1px_3px_rgba(42,38,34,0.06),0_8px_24px_rgba(42,38,34,0.04)] ring-1 ring-stone-200/40"
        role="img"
        aria-label={`Plano conceptual: ${variantLabel}`}
      >
        <div
          className="w-full p-3 sm:p-5 md:p-6"
          style={{
            aspectRatio: String(aspect),
            maxHeight: "min(82vh, 820px)",
            minHeight: "min(72vw, 320px)",
          }}
        >
          <div
            className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-full [&>svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: render.svg }}
          />
        </div>
      </div>
      <figcaption className="mt-2.5 px-1 text-center text-[11px] leading-relaxed text-stone-500 sm:text-xs">
        {PUBLIC_SVG_DISCLAIMER}
      </figcaption>
    </figure>
  );
}
