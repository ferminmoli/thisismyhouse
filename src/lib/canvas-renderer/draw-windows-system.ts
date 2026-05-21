import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type { WallOpening } from "@/lib/floor-plan/types";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import {
  findExteriorWallSegments,
  findSharedWall,
} from "./shared-wall-geometry";

const GLAZING = "rgba(91, 126, 150, 0.55)";
const FRAME = "rgba(51, 65, 85, 0.9)";
const WALL_CUT = 14;

function windowSpanForZone(
  zone: PlacedZoneRect,
  wallLength: number,
): number {
  if (zone.type === "social") {
    return Math.min(wallLength * 0.42, 72);
  }
  if (zone.type === "private") {
    return Math.min(wallLength * 0.32, 48);
  }
  if (zone.type === "service") {
    return Math.min(wallLength * 0.22, 32);
  }
  return Math.min(wallLength * 0.28, 40);
}

function cutWallForWindow(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
  maskColor: string,
): void {
  const half = op.span / 2 + 1;
  ctx.save();
  ctx.strokeStyle = maskColor;
  ctx.lineWidth = WALL_CUT;
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

function drawWindowSymbol(
  ctx: CanvasRenderingContext2D,
  op: WallOpening,
): void {
  const half = op.span / 2;
  const depth = Math.max(2.5, Math.min(4, op.span * 0.07));

  ctx.save();
  ctx.strokeStyle = FRAME;
  ctx.fillStyle = "rgba(236, 242, 248, 0.85)";
  ctx.lineWidth = 1.1;

  if (op.along === "h") {
    const x = op.centerX - half;
    const y = op.centerY - depth;
    const w = half * 2;
    const h = depth * 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.strokeStyle = GLAZING;
    ctx.lineWidth = 0.9;
    ctx.moveTo(x + 3, op.centerY);
    ctx.lineTo(x + w - 3, op.centerY);
    ctx.stroke();
    const mullion = op.centerX;
    ctx.beginPath();
    ctx.moveTo(mullion, y + 2);
    ctx.lineTo(mullion, y + h - 2);
    ctx.stroke();
  } else {
    const x = op.centerX - depth;
    const y = op.centerY - half;
    const w = depth * 2;
    const h = half * 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.beginPath();
    ctx.strokeStyle = GLAZING;
    ctx.moveTo(op.centerX, y + 3);
    ctx.lineTo(op.centerX, y + h - 3);
    ctx.stroke();
  }

  ctx.restore();
}

function patioFacingWalls(
  zone: PlacedZoneRect,
  layout: FloorplanLayoutResult,
): Set<string> {
  const walls = new Set<string>();
  for (const other of layout.zones) {
    if (other.type !== "outdoor") continue;
    const shared = findSharedWall(zone, other);
    if (!shared) continue;
    walls.add(shared.sideOnA);
  }
  return walls;
}

function maskColorForType(type: ProgramZoneType): string {
  const fills: Record<ProgramZoneType, string> = {
    private: "#f8fafc",
    social: "#f1f5f9",
    service: "#e2e8f0",
    outdoor: "#e8ece9",
    circulation: "#f4f4f5",
  };
  return fills[type] ?? "#f1f5f9";
}

/**
 * Ventanas con heurísticas por tipo de ambiente y orientación al patio.
 */
export function drawWindowsSystem(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
): void {
  const placed = new Set<string>();
  const HABITABLE = new Set<ProgramZoneType>([
    "private",
    "social",
    "service",
  ]);

  for (const zone of layout.zones) {
    if (!HABITABLE.has(zone.type)) continue;

    const exteriors = findExteriorWallSegments(
      zone,
      layout.zones,
      layout.container,
    );
    const patioWalls = patioFacingWalls(zone, layout);
    const maxWindows = zone.type === "social" ? 2 : 1;
    let count = 0;

    const sorted = [...exteriors].sort((a, b) => b.length - a.length);

    for (const seg of sorted) {
      if (count >= maxWindows) break;
      const key = `${zone.id}:${seg.wall}`;
      if (placed.has(key)) continue;

      const towardPatio = patioWalls.has(seg.wall);
      const span = towardPatio
        ? Math.min(seg.length * 0.55, 88)
        : windowSpanForZone(zone, seg.length);

      if (span < 20) continue;

      placed.add(key);
      count++;

      const op: WallOpening = {
        centerX: seg.centerX,
        centerY: seg.centerY,
        span,
        wall: seg.wall,
        along: seg.orientation === "horizontal" ? "h" : "v",
      };

      cutWallForWindow(ctx, op, maskColorForType(zone.type));
      drawWindowSymbol(ctx, op);
    }
  }
}
