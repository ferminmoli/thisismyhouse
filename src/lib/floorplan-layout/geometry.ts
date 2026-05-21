import type { LayoutRect } from "./types";

export type SplitAxis = "vertical" | "horizontal";

export function rectArea(rect: LayoutRect): number {
  return rect.width * rect.height;
}

export function aspectRatio(rect: LayoutRect): number {
  if (rect.height <= 0) return Infinity;
  return rect.width / rect.height;
}

export function aspectInRange(
  rect: LayoutRect,
  range: [number, number],
): boolean {
  const ar = aspectRatio(rect);
  return ar >= range[0] && ar <= range[1];
}

/** Distancia a la banda válida (0 = cumple). */
export function aspectViolation(
  rect: LayoutRect,
  range: [number, number],
): number {
  const ar = aspectRatio(rect);
  if (ar < range[0]) return range[0] - ar;
  if (ar > range[1]) return ar - range[1];
  return 0;
}

export function splitRect(
  rect: LayoutRect,
  axis: SplitAxis,
  ratio: number,
): [LayoutRect, LayoutRect] {
  const t = Math.min(1, Math.max(0, ratio));

  if (axis === "vertical") {
    const w1 = rect.width * t;
    const w2 = rect.width - w1;
    return [
      { x: rect.x, y: rect.y, width: w1, height: rect.height },
      { x: rect.x + w1, y: rect.y, width: w2, height: rect.height },
    ];
  }

  const h1 = rect.height * t;
  const h2 = rect.height - h1;
  return [
    { x: rect.x, y: rect.y, width: rect.width, height: h1 },
    { x: rect.x, y: rect.y + h1, width: rect.width, height: h2 },
  ];
}

const EPS = 0.5;

import type { LotMask } from "./types";
import { rectFullyInsideMask } from "./lot-mask";

export function rectsInsideMask(rect: LayoutRect, mask: LotMask): boolean {
  return rectFullyInsideMask(rect, mask);
}

export function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return (
    a.x < b.x + b.width - EPS &&
    b.x < a.x + a.width - EPS &&
    a.y < b.y + b.height - EPS &&
    b.y < a.y + a.height - EPS
  );
}

export function rectsEqual(a: LayoutRect, b: LayoutRect): boolean {
  return (
    Math.abs(a.x - b.x) < EPS &&
    Math.abs(a.y - b.y) < EPS &&
    Math.abs(a.width - b.width) < EPS &&
    Math.abs(a.height - b.height) < EPS
  );
}
