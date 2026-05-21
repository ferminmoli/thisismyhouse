import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type {
  FloorplanLayoutResult,
  LotContainer,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import { findSharedWall } from "./shared-wall-geometry";

export const EXTERIOR_WALL_WIDTH = 16;
export const INTERIOR_WALL_WIDTH = 5;
export const PATIO_EDGE_WIDTH = 2.5;
export const INTERIOR_FILL_INSET = 4;

export const EXTERIOR_WALL_COLOR = "#0f172a";
export const INTERIOR_WALL_COLOR = "#64748b";
export const PATIO_EDGE_COLOR = "rgba(100, 116, 139, 0.55)";

type WallKind = "exterior" | "interior" | "patio_open";

type WallSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: WallKind;
};

function segKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = `${Math.round(x1)},${Math.round(y1)}`;
  const b = `${Math.round(x2)},${Math.round(y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const EPS = 2;

function onContainerEdge(
  zone: PlacedZoneRect,
  side: "top" | "bottom" | "left" | "right",
  container: LotContainer,
): boolean {
  switch (side) {
    case "top":
      return zone.y <= container.y + EPS;
    case "bottom":
      return zone.y + zone.height >= container.y + container.height - EPS;
    case "left":
      return zone.x <= container.x + EPS;
    case "right":
      return zone.x + zone.width >= container.x + container.width - EPS;
  }
}

function classifySharedEdge(a: PlacedZoneRect, b: PlacedZoneRect): WallKind {
  if (a.type === "outdoor" || b.type === "outdoor") {
    if (a.type === "social" || b.type === "social") return "patio_open";
    return "patio_open";
  }
  return "interior";
}

function sideCoveredByShared(
  zone: PlacedZoneRect,
  shared: NonNullable<ReturnType<typeof findSharedWall>>,
): "top" | "bottom" | "left" | "right" | null {
  if (shared.orientation === "horizontal") {
    if (Math.abs(zone.y + zone.height - shared.centerY) < EPS) return "bottom";
    if (Math.abs(zone.y - shared.centerY) < EPS) return "top";
  } else {
    if (Math.abs(zone.x + zone.width - shared.centerX) < EPS) return "right";
    if (Math.abs(zone.x - shared.centerX) < EPS) return "left";
  }
  return null;
}

function collectWallSegments(
  zones: PlacedZoneRect[],
  container: LotContainer,
): WallSegment[] {
  const map = new Map<string, WallSegment>();
  const covered = new Map<string, Set<string>>();

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i];
      const b = zones[j];
      const shared = findSharedWall(a, b);
      if (!shared || shared.length < 4) continue;

      const kind = classifySharedEdge(a, b);
      const seg: WallSegment = {
        x1: shared.x1,
        y1: shared.y1,
        x2: shared.x2,
        y2: shared.y2,
        kind,
      };
      const key = segKey(seg.x1, seg.y1, seg.x2, seg.y2);
      const prev = map.get(key);
      if (!prev || (prev.kind === "interior" && kind !== "interior")) {
        map.set(key, seg);
      }

      for (const z of [a, b]) {
        const side = sideCoveredByShared(z, shared);
        if (!side) continue;
        if (!covered.has(z.id)) covered.set(z.id, new Set());
        covered.get(z.id)!.add(side);
      }
    }
  }

  for (const zone of zones) {
    const cov = covered.get(zone.id) ?? new Set<string>();
    const sides = ["top", "bottom", "left", "right"] as const;

    for (const side of sides) {
      if (cov.has(side)) continue;

      let x1: number, y1: number, x2: number, y2: number;
      switch (side) {
        case "top":
          x1 = zone.x;
          y1 = zone.y;
          x2 = zone.x + zone.width;
          y2 = zone.y;
          break;
        case "bottom":
          x1 = zone.x;
          y1 = zone.y + zone.height;
          x2 = zone.x + zone.width;
          y2 = zone.y + zone.height;
          break;
        case "left":
          x1 = zone.x;
          y1 = zone.y;
          x2 = zone.x;
          y2 = zone.y + zone.height;
          break;
        case "right":
          x1 = zone.x + zone.width;
          y1 = zone.y;
          x2 = zone.x + zone.width;
          y2 = zone.y + zone.height;
          break;
      }

      const onLot = onContainerEdge(zone, side, container);
      const kind: WallKind =
        zone.type === "outdoor" && !onLot ? "patio_open" : "exterior";

      if (zone.type === "outdoor" && onLot) continue;

      map.set(segKey(x1, y1, x2, y2), { x1, y1, x2, y2, kind });
    }
  }

  return [...map.values()];
}

function drawSegment(ctx: CanvasRenderingContext2D, seg: WallSegment): void {
  switch (seg.kind) {
    case "exterior":
      ctx.strokeStyle = EXTERIOR_WALL_COLOR;
      ctx.lineWidth = EXTERIOR_WALL_WIDTH;
      ctx.setLineDash([]);
      break;
    case "interior":
      ctx.strokeStyle = INTERIOR_WALL_COLOR;
      ctx.lineWidth = INTERIOR_WALL_WIDTH;
      ctx.setLineDash([]);
      break;
    case "patio_open":
      ctx.strokeStyle = PATIO_EDGE_COLOR;
      ctx.lineWidth = PATIO_EDGE_WIDTH;
      ctx.setLineDash([6, 5]);
      break;
  }

  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  ctx.moveTo(seg.x1, seg.y1);
  ctx.lineTo(seg.x2, seg.y2);
  ctx.stroke();
}

export function renderArchitecturalWalls(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
): void {
  const segments = collectWallSegments(layout.zones, layout.container);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  for (const seg of segments.filter((s) => s.kind === "interior")) {
    drawSegment(ctx, seg);
  }
  ctx.setLineDash([]);
  for (const seg of segments.filter((s) => s.kind === "patio_open")) {
    drawSegment(ctx, seg);
  }
  ctx.setLineDash([]);
  for (const seg of segments.filter((s) => s.kind === "exterior")) {
    drawSegment(ctx, seg);
  }

  ctx.restore();
}

export function innerZoneRect(zone: PlacedZoneRect): PlacedZoneRect | null {
  const inset = INTERIOR_FILL_INSET;
  const w = zone.width - inset * 2;
  const h = zone.height - inset * 2;
  if (w < 8 || h < 8) return null;
  return {
    ...zone,
    x: zone.x + inset,
    y: zone.y + inset,
    width: w,
    height: h,
  };
}

export function punchInteriorFromWalls(
  ctx: CanvasRenderingContext2D,
  zones: PlacedZoneRect[],
  fillForType: (t: ProgramZoneType) => string,
  drawPattern: (ctx: CanvasRenderingContext2D, z: PlacedZoneRect) => void,
): void {
  const ordered = [...zones].sort(
    (a, b) => b.width * b.height - a.width * a.height,
  );

  ctx.save();
  for (const zone of ordered) {
    const inner = innerZoneRect(zone);
    if (!inner) continue;
    ctx.fillStyle = fillForType(zone.type);
    ctx.fillRect(inner.x, inner.y, inner.width, inner.height);
    drawPattern(ctx, inner);
  }
  ctx.restore();
}
