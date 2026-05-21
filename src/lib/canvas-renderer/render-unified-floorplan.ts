import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import { drawExternalDimensions } from "./draw-external-dimensions";
import { drawSmartFurniture } from "./draw-smart-furniture";
import { drawSmartLabels } from "./draw-smart-labels";
import { drawSmartOpenings } from "./draw-smart-openings";
import { drawWindowsSystem } from "./draw-windows-system";
import { drawPlanAnnotations } from "./draw-plan-annotations";
import {
  renderLotAndZoneFills,
  renderWallsAndPunch,
  type RenderBaseFloorplanOptions,
} from "./render-base-floorplan";

export const CANVAS_DIM_PAD = 100;

export type PaintUnifiedFloorplanOptions = RenderBaseFloorplanOptions & {
  pxPerMeter?: number;
  /** Offset de translate del canvas (p. ej. CANVAS_DIM_PAD). */
  contentOffsetX?: number;
  contentOffsetY?: number;
};

/**
 * Pipeline CAD premium (orden técnico):
 * 1. Rellenos + patio · 2. Mobiliario · 3. Muros jerárquicos · 4. Puertas
 * 5. Ventanas · 6. Etiquetas · 7. Cotas · 8. Escala y norte
 */
export function paintUnifiedFloorplan(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  program: ArchitecturalProgram,
  options: PaintUnifiedFloorplanOptions = {},
): void {
  renderLotAndZoneFills(ctx, layout, options);

  drawSmartFurniture(ctx, layout, {
    topologyGraph: program.topologyGraph,
  });

  renderWallsAndPunch(ctx, layout);

  if (program.topologyGraph.length > 0) {
    drawSmartOpenings(ctx, layout, program.topologyGraph);
  }

  drawWindowsSystem(ctx, layout);

  const areaByZoneId = Object.fromEntries(
    program.programmaticZones.map((z) => [z.id, z.idealAreaM2]),
  );

  drawSmartLabels(ctx, layout, {
    targetTotalAreaM2: program.globalConfig.targetTotalAreaM2,
    areaByZoneId,
  });

  drawExternalDimensions(ctx, layout, {
    pxPerMeter: options.pxPerMeter ?? layout.pxPerMeter ?? 10,
  });

  drawPlanAnnotations(
    ctx,
    layout,
    options.contentOffsetX ?? 0,
    options.contentOffsetY ?? 0,
  );
}
