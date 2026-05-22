import type { SvgPlanRender } from "@/lib/architecture/floorPlanPipelineTypes";
import { FINAL_PLAN_DISCLAIMER } from "@/lib/architecture/finalPlanRenderer";

type Props = {
  render: SvgPlanRender | null;
  variantLabel: string;
  fallbackMessage?: string;
  wallGraphDebug?: boolean;
};

export function FinalPlanViewer({
  render,
  variantLabel,
  fallbackMessage = "No hay geometría de planta para mostrar en esta variante.",
  wallGraphDebug = false,
}: Props) {
  if (!render?.svg) {
    return (
      <div
        className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center"
        role="img"
        aria-label="Plano no disponible"
        data-testid="final-plan-renderer-empty"
      >
        <p className="text-sm font-medium text-stone-700">Plano no disponible</p>
        <p className="mt-2 max-w-sm text-sm text-stone-500">{fallbackMessage}</p>
      </div>
    );
  }

  const [, , viewW, viewH] = render.viewBox.split(" ").map(Number);
  const aspect = viewW > 0 && viewH > 0 ? viewW / viewH : 100 / 118;

  return (
    <figure
      className="w-full min-w-0 max-w-full"
      data-testid="final-plan-renderer"
      data-wall-graph-debug={wallGraphDebug ? "true" : "false"}
    >
      <div
        className="overflow-hidden rounded-2xl border border-stone-200/80 bg-[#F5F2EB] shadow-[0_2px_8px_rgba(30,41,59,0.06),0_12px_40px_rgba(30,41,59,0.05)] ring-1 ring-stone-200/50"
        role="img"
        aria-label={`Plano: ${variantLabel}`}
      >
        <div
          className="w-full p-2 sm:p-4 md:p-5"
          style={{
            aspectRatio: String(aspect),
            maxHeight: "min(88vh, 920px)",
            minHeight: "min(72vw, 360px)",
          }}
        >
          <div
            className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:max-w-full [&>svg]:object-contain"
            dangerouslySetInnerHTML={{ __html: render.svg }}
          />
        </div>
      </div>
      <figcaption className="mt-2 px-1 text-center text-[11px] leading-relaxed text-stone-500 sm:text-xs">
        {FINAL_PLAN_DISCLAIMER}
      </figcaption>
    </figure>
  );
}
