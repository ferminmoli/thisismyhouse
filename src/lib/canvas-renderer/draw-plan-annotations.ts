import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import { computePlanEnvelope } from "./dimension-utils";

const ANNOTATION_COLOR = "#475569";
const SCALE_BG = "rgba(255, 255, 255, 0.92)";

/**
 * Barra de escala y flecha norte (presentación conceptual).
 */
export function drawPlanAnnotations(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  offsetX = 0,
  offsetY = 0,
): void {
  const envelope = computePlanEnvelope(layout.zones);
  if (!envelope) return;

  const pxPerMeter = layout.pxPerMeter ?? 10;
  const barMeters = pickScaleBarMeters(envelope.width / pxPerMeter);
  const barPx = barMeters * pxPerMeter;

  const anchorX = offsetX + envelope.minX + 24;
  const anchorY = offsetY + envelope.maxY + 52;

  ctx.save();
  ctx.fillStyle = SCALE_BG;
  ctx.strokeStyle = ANNOTATION_COLOR;
  ctx.lineWidth = 1.2;

  const pad = 8;
  const boxW = barPx + 80;
  const boxH = 36;
  ctx.fillRect(anchorX - pad, anchorY - boxH - pad, boxW, boxH + pad * 2);
  ctx.strokeRect(anchorX - pad, anchorY - boxH - pad, boxW, boxH + pad * 2);

  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.lineTo(anchorX + barPx, anchorY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY - 4);
  ctx.lineTo(anchorX, anchorY + 4);
  ctx.moveTo(anchorX + barPx, anchorY - 4);
  ctx.lineTo(anchorX + barPx, anchorY + 4);
  ctx.stroke();

  ctx.font =
    "600 10px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillStyle = ANNOTATION_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`${barMeters} m`, anchorX + barPx + 8, anchorY);
  ctx.font =
    "500 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Escala conceptual", anchorX, anchorY - 18);

  const nx = offsetX + envelope.maxX - 36;
  const ny = offsetY + envelope.minY - 28;
  drawNorthArrow(ctx, nx, ny);

  ctx.restore();
}

function pickScaleBarMeters(totalWidthM: number): number {
  const candidates = [1, 2, 3, 5, 10];
  for (const m of candidates) {
    if (totalWidthM / m >= 2 && totalWidthM / m <= 8) return m;
  }
  return candidates.find((m) => m <= totalWidthM) ?? 5;
}

function drawNorthArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  const len = 22;
  ctx.save();
  ctx.strokeStyle = ANNOTATION_COLOR;
  ctx.fillStyle = ANNOTATION_COLOR;
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x - 5, y + 8);
  ctx.moveTo(x, y);
  ctx.lineTo(x + 5, y + 8);
  ctx.stroke();

  ctx.font =
    "700 9px 'Helvetica Neue', Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("N", x, y - 4);
  ctx.restore();
}
