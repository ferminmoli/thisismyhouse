import type { ConstraintLot, PlacedZone } from "./types";

export type Rect = Pick<PlacedZone, "x" | "y" | "w" | "h">;

export function rectArea(r: Rect): number {
  return r.w * r.h;
}

export function rectCenter(r: Rect) {
  return { cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

export function overlapAmount(a: Rect, b: Rect): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

export function rectsOverlap(a: Rect, b: Rect, tol = 0.01): boolean {
  return overlapAmount(a, b) > tol;
}

export function clampRectToLot(r: PlacedZone, lot: ConstraintLot): PlacedZone {
  let { x, y, w, h } = r;
  w = Math.max(1, Math.min(w, lot.width));
  h = Math.max(1, Math.min(h, lot.height));
  x = Math.max(0, Math.min(x, lot.width - w));
  y = Math.max(0, Math.min(y, lot.height - h));
  return { ...r, x, y, w, h, area: w * h };
}

export function snap(value: number, grid: number): number {
  if (grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export function snapRect(r: PlacedZone, lot: ConstraintLot, grid: number): PlacedZone {
  const w = Math.max(grid, snap(r.w, grid));
  const h = Math.max(grid, snap(r.h, grid));
  const x = snap(r.x, grid);
  const y = snap(r.y, grid);
  return clampRectToLot({ ...r, x, y, w, h }, lot);
}

export function aspectRatio(r: Rect): number {
  return r.h > 0 ? r.w / r.h : 1;
}

export function enforceAspectRatio(
  r: PlacedZone,
  range: readonly [number, number],
  preserveArea = true,
): PlacedZone {
  const [minAr, maxAr] = range;
  let { w, h } = r;
  const targetArea = preserveArea ? r.w * r.h : r.area;

  let ar = w / Math.max(h, 0.01);
  if (ar < minAr) {
    h = Math.sqrt(targetArea / minAr);
    w = targetArea / h;
  } else if (ar > maxAr) {
    w = Math.sqrt(targetArea * maxAr);
    h = targetArea / w;
  }

  return { ...r, w, h, area: w * h };
}

/** Minimum gap to consider zones as touching for adjacency. */
export const ADJACENCY_GAP = 1.2;
