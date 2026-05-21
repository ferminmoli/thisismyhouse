import type { WallOpening } from "@/lib/floor-plan/types";

const JAMB = "#1e293b";
const ARC_DASH = [3, 2.5];

export type DoorSwingGeometry = {
  hingeX: number;
  hingeY: number;
  leafX: number;
  leafY: number;
  arcStart: number;
  arcEnd: number;
  ccw: boolean;
  radius: number;
};

/** Geometría de puerta abierta 90° (bisagra al inicio del vano). */
export function doorSwingGeometry(op: WallOpening): DoorSwingGeometry {
  const half = op.span / 2;
  const r = Math.min(half, op.span * 0.92);
  const { centerX: cx, centerY: cy, wall } = op;

  switch (wall) {
    case "bottom":
      return {
        hingeX: cx - half,
        hingeY: cy,
        leafX: cx - half,
        leafY: cy - r,
        arcStart: -Math.PI / 2,
        arcEnd: 0,
        ccw: false,
        radius: r,
      };
    case "top":
      return {
        hingeX: cx - half,
        hingeY: cy,
        leafX: cx - half,
        leafY: cy + r,
        arcStart: Math.PI / 2,
        arcEnd: Math.PI,
        ccw: true,
        radius: r,
      };
    case "right":
      return {
        hingeX: cx,
        hingeY: cy + half,
        leafX: cx - r,
        leafY: cy + half,
        arcStart: Math.PI,
        arcEnd: Math.PI * 1.5,
        ccw: true,
        radius: r,
      };
    case "left":
      return {
        hingeX: cx,
        hingeY: cy + half,
        leafX: cx + r,
        leafY: cy + half,
        arcStart: 0,
        arcEnd: -Math.PI / 2,
        ccw: false,
        radius: r,
      };
  }
}

/**
 * Hoja abierta (línea sólida fina) + arco de trayectoria punteado (`ctx.arc`).
 */
export function drawDoorOpen90(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
) {
  const g = doorSwingGeometry(op);

  ctx.save();

  ctx.strokeStyle = JAMB;
  ctx.fillStyle = JAMB;
  ctx.lineCap = "round";

  ctx.lineWidth = 1.15;
  ctx.beginPath();
  ctx.moveTo(g.hingeX, g.hingeY);
  ctx.lineTo(g.leafX, g.leafY);
  ctx.stroke();

  ctx.setLineDash(ARC_DASH);
  ctx.lineWidth = 0.95;
  ctx.strokeStyle = "rgba(30, 41, 59, 0.75)";
  ctx.beginPath();
  ctx.arc(g.hingeX, g.hingeY, g.radius, g.arcStart, g.arcEnd, g.ccw);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(g.hingeX, g.hingeY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Recorte mínimo del muro en el vano (para insertar símbolo). */
export function cutOpeningInWall(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
  extra = 0,
  maskColor = "#f8fafc",
) {
  const half = op.span / 2 + extra;
  ctx.save();
  ctx.strokeStyle = maskColor;
  ctx.lineWidth = op.along === "h" ? 16 : 16;
  ctx.lineCap = "butt";
  ctx.beginPath();
  if (op.along === "h") {
    ctx.moveTo(op.centerX - half, op.centerY);
    ctx.lineTo(op.centerX + half, op.centerY);
  } else {
    ctx.moveTo(op.centerX, op.centerY - half);
    ctx.lineTo(op.centerX, op.centerY + half);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Símbolo CAD de ventana: marco delgado + línea central paralela al muro.
 */
export function drawWindowCad(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
) {
  const half = op.span / 2;
  const depth = Math.max(2, Math.min(3.5, op.span * 0.08));
  const frame = "rgba(51, 65, 85, 0.85)";
  const glazing = "rgba(100, 116, 139, 0.65)";

  ctx.save();
  ctx.strokeStyle = frame;
  ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
  ctx.lineWidth = 1;

  if (op.along === "h") {
    const x = op.centerX - half;
    const y = op.centerY - depth;
    const w = half * 2;
    const h = depth * 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.strokeStyle = glazing;
    ctx.lineWidth = 0.85;
    ctx.moveTo(x + 2, op.centerY);
    ctx.lineTo(x + w - 2, op.centerY);
    ctx.stroke();
  } else {
    const x = op.centerX - depth;
    const y = op.centerY - half;
    const w = depth * 2;
    const h = half * 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.strokeStyle = glazing;
    ctx.lineWidth = 0.85;
    ctx.moveTo(op.centerX, y + 2);
    ctx.lineTo(op.centerX, y + h - 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawSlidingDoor(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
) {
  const half = op.span / 2;
  const gap = 3.5;
  ctx.save();
  ctx.strokeStyle = JAMB;
  ctx.lineWidth = 1.3;
  if (op.along === "h") {
    ctx.beginPath();
    ctx.moveTo(op.centerX - half, op.centerY - gap);
    ctx.lineTo(op.centerX + half, op.centerY - gap);
    ctx.moveTo(op.centerX - half, op.centerY + gap);
    ctx.lineTo(op.centerX + half, op.centerY + gap);
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(op.centerX - half * 0.7, op.centerY);
    ctx.lineTo(op.centerX + half * 0.7, op.centerY);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(op.centerX - gap, op.centerY - half);
    ctx.lineTo(op.centerX - gap, op.centerY + half);
    ctx.moveTo(op.centerX + gap, op.centerY - half);
    ctx.lineTo(op.centerX + gap, op.centerY + half);
    ctx.stroke();
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(op.centerX, op.centerY - half * 0.7);
    ctx.lineTo(op.centerX, op.centerY + half * 0.7);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawOpenPassage(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
) {
  const half = op.span / 2 + op.span * 0.2;
  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  if (op.along === "h") {
    ctx.moveTo(op.centerX - half, op.centerY);
    ctx.lineTo(op.centerX + half, op.centerY);
  } else {
    ctx.moveTo(op.centerX, op.centerY - half);
    ctx.lineTo(op.centerX, op.centerY + half);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
