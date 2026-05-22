"use client";

import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { buildArcadaPocRender } from "@/lib/floorplan-arcada-poc";
import { useMemo } from "react";

export type ArcadaPocRendererProps = {
  plan: PublicPlanGeometry;
  title: string;
  variantLabel: string;
  variantId: string;
  devMode?: boolean;
};

export function ArcadaPocRenderer({
  plan,
  title,
  variantLabel,
  variantId,
  devMode = false,
}: ArcadaPocRendererProps) {
  const render = useMemo(() => {
    if (!plan?.zones?.length) return null;
    return buildArcadaPocRender({
      plan,
      title,
      variantLabel,
      variantId,
      devMode,
    });
  }, [plan, title, variantLabel, variantId, devMode]);

  if (!render?.svg) {
    return (
      <div
        className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center"
        role="img"
        aria-label="Plano Arcada no disponible"
        data-testid="arcada-poc-renderer-empty"
      >
        <p className="text-sm font-medium text-stone-700">Plano no disponible</p>
        <p className="mt-2 max-w-sm text-sm text-stone-500">
          No hay geometría para el render experimental Arcada.
        </p>
      </div>
    );
  }

  const [, , viewW, viewH] = render.viewBox.split(" ").map(Number);
  const aspect = viewW > 0 && viewH > 0 ? viewW / viewH : 1;

  return (
    <figure className="w-full min-w-0 max-w-full" data-testid="arcada-poc-renderer">
      <div
        className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_2px_8px_rgba(30,41,59,0.06),0_12px_40px_rgba(30,41,59,0.05)] ring-1 ring-stone-200/50"
        role="img"
        aria-label={`Plano Arcada POC: ${variantLabel}`}
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
        Render experimental Arcada — planta preliminar conceptual. No apto para obra ni
        validación municipal.
      </figcaption>
    </figure>
  );
}
