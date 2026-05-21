import type { PlacedZoneRect } from "@/lib/floorplan-layout/types";

const PAVEMENT = "#e8ece9";
const PAVEMENT_LINE = "rgba(148, 163, 184, 0.35)";
const PLANT = "rgba(74, 124, 89, 0.45)";
const PERGOLA = "rgba(100, 116, 139, 0.4)";

function isPatioZone(zone: PlacedZoneRect): boolean {
  return (
    zone.type === "outdoor" ||
    /patio|jardin|terraza|parrill|quincho/i.test(zone.id + zone.label)
  );
}

/** Pavimento, sombreado exterior y hints de vida al aire libre. */
export function drawPatioAtmosphere(
  ctx: CanvasRenderingContext2D,
  zone: PlacedZoneRect,
): void {
  const { x, y, width: w, height: h } = zone;
  if (w < 40 || h < 30) return;

  ctx.save();

  ctx.fillStyle = PAVEMENT;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = PAVEMENT_LINE;
  ctx.lineWidth = 0.6;
  const tile = 28;
  for (let px = x; px < x + w; px += tile) {
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }
  for (let py = y; py < y + h; py += tile) {
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "rgba(134, 239, 172, 0.12)";
  ctx.fillRect(x + w * 0.05, y + h * 0.08, w * 0.9, h * 0.35);

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = PLANT;
  const plants = [
    [x + w * 0.12, y + h * 0.2],
    [x + w * 0.78, y + h * 0.18],
    [x + w * 0.55, y + h * 0.12],
    [x + w * 0.25, y + h * 0.75],
    [x + w * 0.82, y + h * 0.7],
  ];
  for (const [px, py] of plants) {
    ctx.beginPath();
    ctx.arc(px, py, Math.min(w, h) * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - Math.min(w, h) * 0.06);
    ctx.strokeStyle = PLANT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const bbqX = x + w * 0.68;
  const bbqY = y + h * 0.55;
  const bbqW = Math.min(w * 0.18, 48);
  const bbqH = Math.min(h * 0.12, 28);
  ctx.strokeStyle = "rgba(71, 85, 105, 0.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bbqX, bbqY, bbqW, bbqH);
  ctx.beginPath();
  ctx.arc(bbqX + bbqW / 2, bbqY - 4, bbqW * 0.2, 0, Math.PI);
  ctx.stroke();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = PERGOLA;
  ctx.lineWidth = 1.2;
  const pergolaY = y + h * 0.22;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, pergolaY);
  ctx.lineTo(x + w * 0.92, pergolaY);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const px = x + w * (0.12 + i * 0.18);
    ctx.beginPath();
    ctx.moveTo(px, pergolaY);
    ctx.lineTo(px, pergolaY + h * 0.18);
    ctx.stroke();
  }

  ctx.restore();
}
