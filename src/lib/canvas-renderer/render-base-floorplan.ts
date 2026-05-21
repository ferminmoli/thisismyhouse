import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import { drawPatioAtmosphere } from "./draw-patio-atmosphere";
import {
  INTERIOR_FILL_INSET,
  punchInteriorFromWalls,
  renderArchitecturalWalls,
} from "./wall-system";

/** Compat: mobiliario usa inset de relleno interior. */
export const BASE_WALL_INSET_PX = INTERIOR_FILL_INSET;
export const BASE_WALL_LINE_WIDTH = 12;

export const BASE_WALL_STROKE_COLOR = "#1e293b";

/** Rellenos desaturados por tipo de ambiente. */
export const ZONE_FILL_BY_TYPE: Record<ProgramZoneType, string> = {
  private: "#f8fafc",
  social: "#f1f5f9",
  service: "#e2e8f0",
  outdoor: "#e8ece9",
  circulation: "#f4f4f5",
};

export type RenderBaseFloorplanOptions = {
  /** Fondo del bounding box del lote (fuera de habitaciones). */
  lotBackground?: string;
  /** Limpia todo el canvas (no solo el lote). */
  clearFullCanvas?: boolean;
};

function fillColorForType(type: ProgramZoneType): string {
  return ZONE_FILL_BY_TYPE[type] ?? "#f1f5f9";
}

/**
 * Patrones muy ligeros (solo relleno, sin bordes).
 * Se dibujan encima del color plano con baja opacidad.
 */
function drawLightZonePattern(
  ctx: CanvasRenderingContext2D,
  zone: PlacedZoneRect,
): void {
  if (zone.width < 24 || zone.height < 24) return;

  ctx.save();
  ctx.globalAlpha = 0.22;

  if (zone.type === "service") {
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 0.6;
    const step = 14;
    for (let x = zone.x; x < zone.x + zone.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, zone.y);
      ctx.lineTo(x, zone.y + zone.height);
      ctx.stroke();
    }
    for (let y = zone.y; y < zone.y + zone.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(zone.x, y);
      ctx.lineTo(zone.x + zone.width, y);
      ctx.stroke();
    }
  } else if (zone.type === "social") {
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    const step = 22;
    for (let x = zone.x; x < zone.x + zone.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, zone.y);
      ctx.lineTo(x + step * 0.5, zone.y + zone.height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Capa 1 — fondos de zona (sin muros). */
export function renderLotAndZoneFills(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  options: RenderBaseFloorplanOptions = {},
): void {
  const { zones, container } = layout;
  const lotBg = options.lotBackground ?? "#e7e5e4";
  const clearFull = options.clearFullCanvas ?? true;

  if (clearFull) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  ctx.fillStyle = lotBg;
  ctx.fillRect(container.x, container.y, container.width, container.height);

  if (layout.mask?.shape === "l_shape") {
    drawLShapeVoid(ctx, layout);
    drawLShapeLegend(ctx, layout);
  }

  drawZoneFillLayer(ctx, zones);
}

function drawLShapeVoid(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
): void {
  const mask = layout.mask;
  if (!mask) return;

  ctx.save();
  ctx.fillStyle = "#d6d3d1";
  for (const { col, row } of mask.voidCells) {
    ctx.fillRect(
      mask.bbox.x + col * mask.cellWidth,
      mask.bbox.y + row * mask.cellHeight,
      mask.cellWidth,
      mask.cellHeight,
    );
  }
  ctx.restore();
}

/** Leyenda del hueco L (no habitable). */
function drawLShapeLegend(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
): void {
  const mask = layout.mask;
  if (!mask || mask.voidCells.length === 0) return;

  const { bbox, cellWidth, cellHeight } = mask;
  const first = mask.voidCells[0];
  const lx = bbox.x + first.col * cellWidth + 4;
  const ly = bbox.y + first.row * cellHeight + cellHeight * 0.55;

  ctx.save();
  ctx.font =
    "600 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#57534e";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Hueco L (no habitable)", lx, ly);
  ctx.restore();
}

/** Capas 2–3 — muros jerárquicos + punch interior. */
export function renderWallsAndPunch(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
): void {
  renderArchitecturalWalls(ctx, layout);
  punchInteriorFromWalls(
    ctx,
    layout.zones,
    fillColorForType,
    drawLightZonePattern,
  );
}

function drawZoneFillLayer(
  ctx: CanvasRenderingContext2D,
  zones: PlacedZoneRect[],
): void {
  const ordered = [...zones].sort(
    (a, b) => a.width * a.height - b.width * b.height,
  );

  for (const zone of ordered) {
    ctx.fillStyle = fillColorForType(zone.type);
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    if (zone.type === "outdoor") {
      drawPatioAtmosphere(ctx, zone);
    } else {
      drawLightZonePattern(ctx, zone);
    }
  }
}

export function renderBaseFloorplan(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  options: RenderBaseFloorplanOptions = {},
): void {
  renderLotAndZoneFills(ctx, layout, options);
  renderWallsAndPunch(ctx, layout);
}

