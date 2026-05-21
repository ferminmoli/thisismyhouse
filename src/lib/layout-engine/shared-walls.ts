import { ADJACENCY_GAP } from "./geometry";
import type { PlacedZone, SharedWallSegment } from "./types";

const TOL = ADJACENCY_GAP + 0.5;

function verticalOverlap(a: PlacedZone, b: PlacedZone) {
  return Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
}

function horizontalOverlap(a: PlacedZone, b: PlacedZone) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
}

/** Detect shared wall between two placed zones (if any). */
export function findSharedWall(
  a: PlacedZone,
  b: PlacedZone,
): SharedWallSegment | null {
  if (Math.abs(a.x + a.w - b.x) < TOL && verticalOverlap(a, b) > TOL) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    return {
      from: a.id,
      to: b.id,
      wallFrom: "right",
      x1: a.x + a.w,
      y1,
      x2: a.x + a.w,
      y2,
      along: "v",
      length: y2 - y1,
    };
  }
  if (Math.abs(b.x + b.w - a.x) < TOL && verticalOverlap(a, b) > TOL) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    return {
      from: a.id,
      to: b.id,
      wallFrom: "left",
      x1: a.x,
      y1,
      x2: a.x,
      y2,
      along: "v",
      length: y2 - y1,
    };
  }
  if (Math.abs(a.y + a.h - b.y) < TOL && horizontalOverlap(a, b) > TOL) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    return {
      from: a.id,
      to: b.id,
      wallFrom: "bottom",
      x1,
      y1: a.y + a.h,
      x2,
      y2: a.y + a.h,
      along: "h",
      length: x2 - x1,
    };
  }
  if (Math.abs(b.y + b.h - a.y) < TOL && horizontalOverlap(a, b) > TOL) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    return {
      from: a.id,
      to: b.id,
      wallFrom: "top",
      x1,
      y1: a.y,
      x2,
      y2: a.y,
      along: "h",
      length: x2 - x1,
    };
  }
  return null;
}

export function collectSharedWalls(
  zones: PlacedZone[],
  pairs: Array<{ from: string; to: string }>,
): SharedWallSegment[] {
  const byId = new Map(zones.map((z) => [z.id, z]));
  const seen = new Set<string>();
  const walls: SharedWallSegment[] = [];

  for (const { from, to } of pairs) {
    const key = [from, to].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const a = byId.get(from);
    const b = byId.get(to);
    if (!a || !b) continue;
    const wall = findSharedWall(a, b) ?? findSharedWall(b, a);
    if (wall) walls.push(wall);
  }

  return walls;
}
