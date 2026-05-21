import type { FloorplanLayoutResult, PlacedZoneRect } from "@/lib/floorplan-layout/types";
import {
  computePlanEnvelope,
  DEFAULT_PX_PER_METER,
  DIM_LINE_COLOR,
  drawArchitecturalTick,
  drawDimensionTextWithMask,
  ENVELOPE_EPS,
  formatMetersLabel,
  DIM_EXTENSION_GAP,
  PRIMARY_DIM_OFFSET,
  TOTAL_DIM_EXTRA_OFFSET,
  type PlanEnvelope,
} from "./dimension-utils";

export type DrawExternalDimensionsOptions = {
  /** Píxeles por metro (default: 10 px = 1 m). */
  pxPerMeter?: number;
  /** Si se pasa, ajusta escala horizontal al ancho real del programa. */
  targetTotalWidthM2?: number;
  primaryOffset?: number;
  maskFill?: string;
};

function resolvePxPerMeter(
  envelope: PlanEnvelope,
  options: DrawExternalDimensionsOptions,
): number {
  if (options.pxPerMeter && options.pxPerMeter > 0) {
    return options.pxPerMeter;
  }
  if (options.targetTotalWidthM2 && options.targetTotalWidthM2 > 0) {
    return envelope.width / options.targetTotalWidthM2;
  }
  return DEFAULT_PX_PER_METER;
}

function zonesOnTopEdge(
  zones: PlacedZoneRect[],
  minY: number,
): PlacedZoneRect[] {
  return zones
    .filter((z) => Math.abs(z.y - minY) < ENVELOPE_EPS)
    .sort((a, b) => a.x - b.x);
}

function zonesOnLeftEdge(
  zones: PlacedZoneRect[],
  minX: number,
): PlacedZoneRect[] {
  return zones
    .filter((z) => Math.abs(z.x - minX) < ENVELOPE_EPS)
    .sort((a, b) => a.y - b.y);
}

function drawHorizontalDimension(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  yBuilding: number,
  yDim: number,
  pxPerMeter: number,
  maskFill: string,
): void {
  if (Math.abs(x2 - x1) < 6) return;

  ctx.save();
  ctx.strokeStyle = DIM_LINE_COLOR;
  ctx.lineWidth = 1;

  const ext = DIM_EXTENSION_GAP;
  ctx.beginPath();
  ctx.moveTo(x1, yBuilding);
  ctx.lineTo(x1, yDim - ext);
  ctx.moveTo(x2, yBuilding);
  ctx.lineTo(x2, yDim - ext);
  ctx.moveTo(x1, yDim);
  ctx.lineTo(x2, yDim);
  ctx.stroke();

  drawArchitecturalTick(ctx, x1, yDim, true);
  drawArchitecturalTick(ctx, x2, yDim, true);

  const label = formatMetersLabel(x2 - x1, pxPerMeter);
  drawDimensionTextWithMask(ctx, label, (x1 + x2) / 2, yDim - 4, {
    align: "center",
    baseline: "bottom",
    maskFill,
  });

  ctx.restore();
}

function drawVerticalDimension(
  ctx: CanvasRenderingContext2D,
  y1: number,
  y2: number,
  xBuilding: number,
  xDim: number,
  pxPerMeter: number,
  maskFill: string,
): void {
  if (Math.abs(y2 - y1) < 6) return;

  ctx.save();
  ctx.strokeStyle = DIM_LINE_COLOR;
  ctx.lineWidth = 1;

  const ext = DIM_EXTENSION_GAP;
  ctx.beginPath();
  ctx.moveTo(xBuilding, y1);
  ctx.lineTo(xDim - ext, y1);
  ctx.moveTo(xBuilding, y2);
  ctx.lineTo(xDim - ext, y2);
  ctx.moveTo(xDim, y1);
  ctx.lineTo(xDim, y2);
  ctx.stroke();

  drawArchitecturalTick(ctx, xDim, y1, false);
  drawArchitecturalTick(ctx, xDim, y2, false);

  const label = formatMetersLabel(y2 - y1, pxPerMeter);
  drawDimensionTextWithMask(ctx, label, xDim - 5, (y1 + y2) / 2, {
    rotated: true,
    align: "center",
    baseline: "middle",
    maskFill,
  });

  ctx.restore();
}

/**
 * Cotas perimetrales automáticas: segmentos por fachada + totales del envolvente.
 * Ejecutar después de muros, aberturas y etiquetas.
 */
export function drawExternalDimensions(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  options: DrawExternalDimensionsOptions = {},
): void {
  const envelope = computePlanEnvelope(layout.zones);
  if (!envelope) return;

  const { minX, minY, maxX, maxY } = envelope;
  const primaryOffset = options.primaryOffset ?? PRIMARY_DIM_OFFSET;
  const yDimPrimary = minY - primaryOffset;
  const xDimPrimary = minX - primaryOffset;
  const yDimTotal = minY - primaryOffset - TOTAL_DIM_EXTRA_OFFSET;
  const xDimTotal = minX - primaryOffset - TOTAL_DIM_EXTRA_OFFSET;

  const pxPerMeter = resolvePxPerMeter(envelope, options);
  const maskFill = options.maskFill ?? "#fafaf9";

  const topZones = zonesOnTopEdge(layout.zones, minY);
  for (const z of topZones) {
    drawHorizontalDimension(
      ctx,
      z.x,
      z.x + z.width,
      z.y,
      yDimPrimary,
      pxPerMeter,
      maskFill,
    );
  }

  const leftZones = zonesOnLeftEdge(layout.zones, minX);
  for (const z of leftZones) {
    drawVerticalDimension(
      ctx,
      z.y,
      z.y + z.height,
      z.x,
      xDimPrimary,
      pxPerMeter,
      maskFill,
    );
  }

  drawHorizontalDimension(
    ctx,
    minX,
    maxX,
    minY,
    yDimTotal,
    pxPerMeter,
    maskFill,
  );

  drawVerticalDimension(
    ctx,
    minY,
    maxY,
    minX,
    xDimTotal,
    pxPerMeter,
    maskFill,
  );

  ctx.setLineDash([]);
}

/** Alias histórico del POC. */
export function drawLayoutExteriorDimensions(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  metersPerPx?: number,
): void {
  drawExternalDimensions(ctx, layout, {
    pxPerMeter: metersPerPx ? 1 / metersPerPx : undefined,
  });
}
