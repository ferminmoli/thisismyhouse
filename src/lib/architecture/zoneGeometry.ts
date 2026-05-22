import type { RenderZone } from "./generatedPlan";

export type SharedWallSide = "top" | "right" | "bottom" | "left";

export type ZoneAdjacencyGeometry = {
  touches: boolean;
  sharedWall: SharedWallSide | null;
  /** Lado del rectángulo A que comparte el muro. */
  wallOnA: SharedWallSide | null;
  overlapLength: number;
  message: string;
};

const EPS = 0.5;

/** Longitud mínima de segmento de muro compartido (unidades 0–100). */
export const MIN_SHARED_WALL_LENGTH = 4;

export function hasRealSharedWall(
  geo: ZoneAdjacencyGeometry,
  minLength = MIN_SHARED_WALL_LENGTH,
): boolean {
  return (
    geo.sharedWall != null &&
    geo.wallOnA != null &&
    geo.overlapLength >= minLength
  );
}

function overlap1D(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
): number {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

export function analyzeZoneAdjacency(
  a: RenderZone,
  b: RenderZone,
): ZoneAdjacencyGeometry {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const candidates: Array<{
    wallOnA: SharedWallSide;
    sharedWall: SharedWallSide;
    overlap: number;
  }> = [];

  if (Math.abs(ax2 - b.x) <= EPS) {
    const o = overlap1D(a.y, ay2, b.y, by2);
    if (o > EPS) candidates.push({ wallOnA: "right", sharedWall: "left", overlap: o });
  }
  if (Math.abs(bx2 - a.x) <= EPS) {
    const o = overlap1D(a.y, ay2, b.y, by2);
    if (o > EPS) candidates.push({ wallOnA: "left", sharedWall: "right", overlap: o });
  }
  if (Math.abs(ay2 - b.y) <= EPS) {
    const o = overlap1D(a.x, ax2, b.x, bx2);
    if (o > EPS) candidates.push({ wallOnA: "bottom", sharedWall: "top", overlap: o });
  }
  if (Math.abs(by2 - a.y) <= EPS) {
    const o = overlap1D(a.x, ax2, b.x, bx2);
    if (o > EPS) candidates.push({ wallOnA: "top", sharedWall: "bottom", overlap: o });
  }

  if (candidates.length === 0) {
    const corner =
      (Math.abs(ax2 - b.x) <= EPS && Math.abs(ay2 - b.y) <= EPS) ||
      (Math.abs(ax2 - b.x) <= EPS && Math.abs(a.y - by2) <= EPS) ||
      (Math.abs(a.x - bx2) <= EPS && Math.abs(ay2 - b.y) <= EPS) ||
      (Math.abs(a.x - bx2) <= EPS && Math.abs(a.y - by2) <= EPS);
    if (corner) {
      return {
        touches: true,
        sharedWall: null,
        wallOnA: null,
        overlapLength: 0,
        message:
          "Solo contacto en esquina — no hay segmento de muro compartido (no válido para puertas).",
      };
    }
    return {
      touches: false,
      sharedWall: null,
      wallOnA: null,
      overlapLength: 0,
      message: "Las zonas no comparten un muro (sin contacto físico).",
    };
  }

  const best = candidates.sort((x, y) => y.overlap - x.overlap)[0]!;
  return {
    touches: true,
    sharedWall: best.sharedWall,
    wallOnA: best.wallOnA,
    overlapLength: Math.round(best.overlap * 10) / 10,
    message: `Muro compartido (${best.wallOnA} ↔ ${best.sharedWall}), solape ${best.overlap.toFixed(1)}.`,
  };
}

export function rectsOverlap(a: RenderZone, b: RenderZone): boolean {
  const gap = 0.05;
  return (
    a.x < b.x + b.width - gap &&
    a.x + a.width > b.x + gap &&
    a.y < b.y + b.height - gap &&
    a.y + a.height > b.y + gap
  );
}
