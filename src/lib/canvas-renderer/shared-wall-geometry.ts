import type { WallSide } from "@/lib/floor-plan/types";
import type { LotContainer, PlacedZoneRect } from "@/lib/floorplan-layout/types";

const EPS = 1.5;

export type SharedWallSegment = {
  orientation: "horizontal" | "vertical";
  centerX: number;
  centerY: number;
  /** Longitud útil del tabique compartido (px). */
  length: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sideOnA: WallSide;
  sideOnB: WallSide;
};

export type ExteriorWallSegment = {
  zoneId: string;
  wall: WallSide;
  centerX: number;
  centerY: number;
  length: number;
  orientation: "horizontal" | "vertical";
};

function xOverlap(a: PlacedZoneRect, b: PlacedZoneRect): number {
  return Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
}

function yOverlap(a: PlacedZoneRect, b: PlacedZoneRect): number {
  return Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
}

/** Muro compartido entre dos rectángulos adyacentes (borde a borde). */
export function findSharedWall(
  a: PlacedZoneRect,
  b: PlacedZoneRect,
): SharedWallSegment | null {
  if (Math.abs(a.y + a.height - b.y) < EPS && xOverlap(a, b) > EPS) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y = (a.y + a.height + b.y) / 2;
    return {
      orientation: "horizontal",
      centerX: (x1 + x2) / 2,
      centerY: y,
      length: x2 - x1,
      x1,
      y1: y,
      x2,
      y2: y,
      sideOnA: "bottom",
      sideOnB: "top",
    };
  }

  if (Math.abs(a.y - (b.y + b.height)) < EPS && xOverlap(a, b) > EPS) {
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y = (a.y + b.y + b.height) / 2;
    return {
      orientation: "horizontal",
      centerX: (x1 + x2) / 2,
      centerY: y,
      length: x2 - x1,
      x1,
      y1: y,
      x2,
      y2: y,
      sideOnA: "top",
      sideOnB: "bottom",
    };
  }

  if (Math.abs(a.x + a.width - b.x) < EPS && yOverlap(a, b) > EPS) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const x = (a.x + a.width + b.x) / 2;
    return {
      orientation: "vertical",
      centerX: x,
      centerY: (y1 + y2) / 2,
      length: y2 - y1,
      x1: x,
      y1,
      x2: x,
      y2,
      sideOnA: "right",
      sideOnB: "left",
    };
  }

  if (Math.abs(a.x - (b.x + b.width)) < EPS && yOverlap(a, b) > EPS) {
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(a.y + a.height, b.y + b.height);
    const x = (a.x + b.x + b.width) / 2;
    return {
      orientation: "vertical",
      centerX: x,
      centerY: (y1 + y2) / 2,
      length: y2 - y1,
      x1: x,
      y1,
      x2: x,
      y2,
      sideOnA: "left",
      sideOnB: "right",
    };
  }

  return null;
}

function intervalOnAxis(
  start: number,
  end: number,
  blocks: Array<{ s: number; e: number }>,
): Array<{ s: number; e: number }> {
  const len = end - start;
  if (len <= 0) return [];
  const sorted = [...blocks]
    .filter((b) => b.e > start && b.s < end)
    .map((b) => ({ s: Math.max(start, b.s), e: Math.min(end, b.e) }))
    .sort((a, b) => a.s - b.s);

  const free: Array<{ s: number; e: number }> = [];
  let cursor = start;
  for (const b of sorted) {
    if (b.s > cursor + EPS) free.push({ s: cursor, e: b.s });
    cursor = Math.max(cursor, b.e);
  }
  if (cursor < end - EPS) free.push({ s: cursor, e: end });
  return free;
}

function neighborBlocksOnSide(
  zone: PlacedZoneRect,
  wall: WallSide,
  others: PlacedZoneRect[],
): Array<{ s: number; e: number }> {
  const blocks: Array<{ s: number; e: number }> = [];
  for (const o of others) {
    if (o.id === zone.id) continue;
    const shared = findSharedWall(zone, o);
    if (!shared) continue;
    if (wall === "top" && shared.sideOnA === "top") {
      blocks.push({ s: shared.x1, e: shared.x2 });
    } else if (wall === "bottom" && shared.sideOnA === "bottom") {
      blocks.push({ s: shared.x1, e: shared.x2 });
    } else if (wall === "left" && shared.sideOnA === "left") {
      blocks.push({ s: shared.y1, e: shared.y2 });
    } else if (wall === "right" && shared.sideOnA === "right") {
      blocks.push({ s: shared.y1, e: shared.y2 });
    }
  }
  return blocks;
}

/** Segmentos de muro sin vecino (fachada / perímetro de la zona). */
export function findExteriorWallSegments(
  zone: PlacedZoneRect,
  allZones: PlacedZoneRect[],
  _container: LotContainer,
): ExteriorWallSegment[] {
  const others = allZones.filter((z) => z.id !== zone.id);
  const segments: ExteriorWallSegment[] = [];

  const sides: WallSide[] = ["top", "bottom", "left", "right"];

  for (const wall of sides) {
    const blocks = neighborBlocksOnSide(zone, wall, others);
    let free: Array<{ s: number; e: number }> = [];

    if (wall === "top" || wall === "bottom") {
      free = intervalOnAxis(zone.x, zone.x + zone.width, blocks);
      const y = wall === "top" ? zone.y : zone.y + zone.height;
      for (const f of free) {
        if (f.e - f.s < 20) continue;
        segments.push({
          zoneId: zone.id,
          wall,
          centerX: (f.s + f.e) / 2,
          centerY: y,
          length: f.e - f.s,
          orientation: "horizontal",
        });
      }
    } else {
      free = intervalOnAxis(zone.y, zone.y + zone.height, blocks);
      const x = wall === "left" ? zone.x : zone.x + zone.width;
      for (const f of free) {
        if (f.e - f.s < 20) continue;
        segments.push({
          zoneId: zone.id,
          wall,
          centerX: x,
          centerY: (f.s + f.e) / 2,
          length: f.e - f.s,
          orientation: "vertical",
        });
      }
    }
  }

  return segments;
}
