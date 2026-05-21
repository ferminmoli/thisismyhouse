import type { TopologyEdge } from "@/lib/architectural-program/types";
import type { WallSide } from "@/lib/floor-plan/types";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import { findExteriorWallSegments, findSharedWall } from "./shared-wall-geometry";
import { BASE_WALL_INSET_PX } from "./render-base-floorplan";

const FURNITURE_STROKE = "#94a3b8";
const FURNITURE_FILL = "rgba(241, 245, 249, 0.6)";
const LINE_W = 1.5;
const WALL_CLEARANCE = 20;
const COUNTERTOP_INSET = 12;

const DOOR_RELATIONS = new Set([
  "direct_access",
  "transition_door",
  "private_door",
  "service_door",
  "visual_and_physical",
]);

type InnerRect = PlacedZoneRect;
type WallInfo = { side: WallSide; length: number };

function applyFurnitureStyle(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = FURNITURE_STROKE;
  ctx.fillStyle = FURNITURE_FILL;
  ctx.lineWidth = LINE_W;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function toInnerRect(zone: PlacedZoneRect): InnerRect | null {
  const inset = BASE_WALL_INSET_PX;
  const w = zone.width - inset * 2;
  const h = zone.height - inset * 2;
  if (w < 48 || h < 48) return null;
  return {
    ...zone,
    x: zone.x + inset,
    y: zone.y + inset,
    width: w,
    height: h,
  };
}

function wallInfos(zone: InnerRect): WallInfo[] {
  return [
    { side: "top", length: zone.width },
    { side: "bottom", length: zone.width },
    { side: "left", length: zone.height },
    { side: "right", length: zone.height },
  ];
}

function doorWallsForZone(
  zoneId: string,
  zones: PlacedZoneRect[],
  topology?: TopologyEdge[],
): Set<WallSide> {
  const walls = new Set<WallSide>();
  if (!topology?.length) return walls;

  const byId = new Map(zones.map((z) => [z.id, z]));
  const self = byId.get(zoneId);
  if (!self) return walls;

  for (const edge of topology) {
    if (!DOOR_RELATIONS.has(edge.relation)) continue;
    let otherId: string | null = null;
    if (edge.from === zoneId) otherId = edge.to;
    else if (edge.to === zoneId) otherId = edge.from;
    if (!otherId) continue;

    const other = byId.get(otherId);
    if (!other) continue;
    const shared = findSharedWall(self, other);
    if (!shared) continue;
    walls.add(edge.from === zoneId ? shared.sideOnA : shared.sideOnB);
  }
  return walls;
}

function exteriorWallSides(
  zone: PlacedZoneRect,
  layout: FloorplanLayoutResult,
): Set<WallSide> {
  const segs = findExteriorWallSegments(zone, layout.zones, layout.container);
  return new Set(segs.map((s) => s.wall));
}

function pickBedWall(
  inner: InnerRect,
  layout: FloorplanLayoutResult,
  topology?: TopologyEdge[],
): WallSide {
  const doors = doorWallsForZone(inner.id, layout.zones, topology);
  const exterior = exteriorWallSides(inner, layout);

  const candidates = wallInfos(inner).filter(
    (w) => !doors.has(w.side) && !exterior.has(w.side),
  );

  const pool = candidates.length > 0 ? candidates : wallInfos(inner);
  return pool.reduce((a, b) => (b.length > a.length ? b : a)).side;
}

function drawBed(
  ctx: CanvasRenderingContext2D,
  inner: InnerRect,
  headboard: WallSide,
): void {
  applyFurnitureStyle(ctx);
  const c = WALL_CLEARANCE;
  let bx = inner.x + c;
  let by = inner.y + c;
  let bw = inner.width - c * 2;
  let bh = inner.height - c * 2;

  const alongTop = headboard === "top" || headboard === "bottom";
  if (alongTop) {
    bh = Math.min(bh * 0.42, inner.height - c * 2);
    if (headboard === "top") by = inner.y + c;
    else by = inner.y + inner.height - c - bh;
    bw = Math.min(bw * 0.72, inner.width - c * 2);
    bx = inner.x + (inner.width - bw) / 2;
  } else {
    bw = Math.min(bw * 0.42, inner.width - c * 2);
    if (headboard === "left") bx = inner.x + c;
    else bx = inner.x + inner.width - c - bw;
    bh = Math.min(bh * 0.72, inner.height - c * 2);
    by = inner.y + (inner.height - bh) / 2;
  }

  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);

  const pw = Math.min(bw * 0.22, 28);
  const ph = Math.min(bh * 0.18, 14);
  const gap = 5;
  const pillowSide =
    headboard === "top"
      ? "top"
      : headboard === "bottom"
        ? "bottom"
        : headboard === "left"
          ? "left"
          : "right";

  ctx.fillStyle = "rgba(148, 163, 184, 0.35)";
  if (pillowSide === "top" || pillowSide === "bottom") {
    const py = pillowSide === "top" ? by + gap : by + bh - ph - gap;
    ctx.fillRect(bx + gap, py, pw, ph);
    ctx.fillRect(bx + bw - pw - gap, py, pw, ph);
    ctx.strokeRect(bx + gap, py, pw, ph);
    ctx.strokeRect(bx + bw - pw - gap, py, pw, ph);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.35, by + bh * 0.55);
    ctx.lineTo(bx + bw * 0.92, by + bh * 0.55);
    ctx.stroke();
  } else {
    const px = pillowSide === "left" ? bx + gap : bx + bw - pw - gap;
    ctx.fillRect(px, by + gap, pw, ph);
    ctx.fillRect(px, by + bh - ph - gap, pw, ph);
    ctx.strokeRect(px, by + gap, pw, ph);
    ctx.strokeRect(px, by + bh - ph - gap, pw, ph);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.55, by + bh * 0.35);
    ctx.lineTo(bx + bw * 0.55, by + bh * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = FURNITURE_FILL;
}

function drawLivingRoom(
  ctx: CanvasRenderingContext2D,
  inner: InnerRect,
  isSalaComedor: boolean,
): void {
  applyFurnitureStyle(ctx);
  const { x, y, width: w, height: h } = inner;

  const sx = x + w * 0.06;
  const sy = y + h * (isSalaComedor ? 0.52 : 0.58);
  const arm = Math.min(w * 0.09, 22);
  const seatW = w * 0.38;
  const seatH = Math.min(h * 0.14, 36);

  ctx.fillRect(sx, sy, seatW, seatH);
  ctx.strokeRect(sx + 0.5, sy + 0.5, seatW - 1, seatH - 1);
  ctx.fillRect(sx, sy - arm, arm, seatH + arm);
  ctx.strokeRect(sx + 0.5, sy - arm + 0.5, arm - 1, seatH + arm - 1);
  const div = 3;
  for (let i = 1; i < div; i++) {
    const dx = sx + (seatW / div) * i;
    ctx.beginPath();
    ctx.moveTo(dx, sy + 2);
    ctx.lineTo(dx, sy + seatH - 2);
    ctx.stroke();
  }

  const cx = x + w * 0.48;
  const cy = y + h * 0.36;
  const cw = w * 0.28;
  const ch = Math.min(h * 0.1, 22);
  ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);

  if (isSalaComedor) {
    const tx = x + w * 0.58;
    const ty = y + h * 0.12;
    const tw = w * 0.34;
    const th = h * 0.28;
    ctx.fillRect(tx, ty, tw, th);
    ctx.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
    const r = Math.min(w, h) * 0.035;
    const chairs = [
      [tx + tw * 0.2, ty - r * 2.2],
      [tx + tw * 0.5, ty - r * 2.2],
      [tx + tw * 0.8, ty - r * 2.2],
      [tx + tw * 0.2, ty + th + r * 2.2],
      [tx + tw * 0.5, ty + th + r * 2.2],
      [tx + tw * 0.8, ty + th + r * 2.2],
    ];
    for (const [px, py] of chairs) {
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawKitchen(ctx: CanvasRenderingContext2D, inner: InnerRect): void {
  applyFurnitureStyle(ctx);
  const { x, y, width: w, height: h } = inner;
  const d = COUNTERTOP_INSET;
  const depth = Math.min(28, Math.min(w, h) * 0.14);

  ctx.lineWidth = LINE_W;
  ctx.beginPath();
  if (w >= h) {
    ctx.moveTo(x + d, y + h - d - depth);
    ctx.lineTo(x + d, y + d);
    ctx.lineTo(x + w - d, y + d);
    ctx.lineTo(x + w - d, y + h - d);
  } else {
    ctx.moveTo(x + d, y + d + depth);
    ctx.lineTo(x + d, y + h - d);
    ctx.lineTo(x + w - d, y + h - d);
    ctx.lineTo(x + w - d, y + d);
  }
  ctx.stroke();

  const sinkX = x + w * 0.2;
  const sinkY = y + h * 0.38;
  const sinkW = Math.min(w * 0.22, 56);
  const sinkH = Math.min(h * 0.16, 32);
  ctx.strokeRect(sinkX, sinkY, sinkW, sinkH);
  ctx.strokeRect(sinkX + 2, sinkY + 2, sinkW - 4, sinkH - 4);
  ctx.beginPath();
  ctx.arc(sinkX + sinkW / 2, sinkY + sinkH / 2, Math.min(sinkW, sinkH) * 0.2, 0, Math.PI * 2);
  ctx.stroke();

  const cookS = Math.min(w, h) * 0.14;
  const cookX = x + w * 0.62;
  const cookY = y + h * 0.34;
  ctx.strokeRect(cookX, cookY, cookS, cookS);
  const r = cookS * 0.14;
  for (const [ox, oy] of [
    [cookX + r * 2, cookY + r * 2],
    [cookX + cookS - r * 2, cookY + r * 2],
    [cookX + r * 2, cookY + cookS - r * 2],
    [cookX + cookS - r * 2, cookY + cookS - r * 2],
  ]) {
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawBathroom(ctx: CanvasRenderingContext2D, inner: InnerRect): void {
  applyFurnitureStyle(ctx);
  const { x, y, width: w, height: h } = inner;
  const pad = 10;

  const toiletX = x + pad;
  const toiletY = y + h * 0.55;
  ctx.beginPath();
  ctx.arc(toiletX, toiletY, Math.min(w, h) * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(
    toiletX + w * 0.06,
    toiletY,
    w * 0.09,
    h * 0.07,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  const vanX = x + w * 0.42;
  const vanY = y + pad;
  const vanW = w * 0.22;
  const vanH = h * 0.14;
  ctx.fillRect(vanX, vanY, vanW, vanH);
  ctx.strokeRect(vanX + 0.5, vanY + 0.5, vanW - 1, vanH - 1);
  ctx.beginPath();
  ctx.ellipse(vanX + vanW / 2, vanY + vanH * 0.55, vanW * 0.28, vanH * 0.35, 0, 0, Math.PI * 2);
  ctx.stroke();

  const shX = x + w * 0.62;
  const shY = y + h * 0.38;
  const shW = w * 0.3;
  const shH = h * 0.48;
  ctx.strokeRect(shX, shY, shW, shH);
  ctx.beginPath();
  ctx.moveTo(shX + 4, shY + 4);
  ctx.lineTo(shX + shW - 4, shY + shH - 4);
  ctx.moveTo(shX + shW - 4, shY + 4);
  ctx.lineTo(shX + 4, shY + shH - 4);
  ctx.stroke();
}

function isBathZone(zone: PlacedZoneRect): boolean {
  const id = zone.id.toLowerCase();
  const label = zone.label.toLowerCase();
  return (
    id.includes("bano") ||
    id.includes("baño") ||
    label.includes("baño") ||
    label.includes("bano")
  );
}

function drawZoneFurniture(
  ctx: CanvasRenderingContext2D,
  zone: PlacedZoneRect,
  layout: FloorplanLayoutResult,
  topology?: TopologyEdge[],
): void {
  const inner = toInnerRect(zone);
  if (!inner) return;

  const id = zone.id.toUpperCase();
  const idL = zone.id.toLowerCase();

  if (id === "COCINA" || idL.includes("cocina")) {
    drawKitchen(ctx, inner);
    return;
  }

  if (id === "BANO_COMPLETO" || isBathZone(zone)) {
    drawBathroom(ctx, inner);
    return;
  }

  if (
    id === "SALA_COMEDOR" ||
    (idL.includes("sala") && idL.includes("comedor"))
  ) {
    drawLivingRoom(ctx, inner, true);
    return;
  }

  if (zone.type === "social" || idL.includes("sala") || idL.includes("estar")) {
    drawLivingRoom(ctx, inner, idL.includes("comedor"));
    return;
  }

  if (zone.type === "private" || idL.includes("dorm")) {
    const wall = pickBedWall(inner, layout, topology);
    drawBed(ctx, inner, wall);
    if (inner.width > 100 && inner.height > 90) {
      drawWardrobe(ctx, inner, wall);
    }
  }
}

function drawWardrobe(
  ctx: CanvasRenderingContext2D,
  inner: InnerRect,
  avoidWall: WallSide,
): void {
  applyFurnitureStyle(ctx);
  const w = Math.min(inner.width * 0.22, 36);
  const h = Math.min(inner.height * 0.55, 72);
  let wx = inner.x + inner.width - w - 14;
  let wy = inner.y + (inner.height - h) / 2;
  if (avoidWall === "right") {
    wx = inner.x + 14;
  }
  if (avoidWall === "left") {
    wx = inner.x + inner.width - w - 14;
  }
  ctx.fillRect(wx, wy, w, h);
  ctx.strokeRect(wx + 0.5, wy + 0.5, w - 1, h - 1);
  ctx.beginPath();
  ctx.moveTo(wx + w / 2, wy + 4);
  ctx.lineTo(wx + w / 2, wy + h - 4);
  ctx.stroke();
}

export type DrawSmartFurnitureOptions = {
  topologyGraph?: TopologyEdge[];
};

/**
 * Mobiliario vectorial minimalista — entre rellenos y muros unificados.
 */
export function drawSmartFurniture(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  options: DrawSmartFurnitureOptions = {},
): void {
  const ordered = [...layout.zones].sort(
    (a, b) => a.width * a.height - b.width * b.height,
  );

  ctx.save();
  for (const zone of ordered) {
    if (zone.type === "circulation" || zone.type === "outdoor") continue;
    drawZoneFurniture(ctx, zone, layout, options.topologyGraph);
  }
  ctx.restore();
}
