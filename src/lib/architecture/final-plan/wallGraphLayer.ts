import { ARCH } from "./architecturalPalette";
import { splitWallForOpening, STROKE } from "./planGeometryUtils";
import type { PlanOpening, WallSegment } from "./types";

const INTERIOR = "#1E293B";
const EXTERIOR_DEBUG = "#B45309";
const OPENING_CUT = "#DC2626";

function segmentMid(seg: WallSegment): { x: number; y: number } {
  return { x: (seg.x1 + seg.x2) / 2, y: (seg.y1 + seg.y2) / 2 };
}

function renderPublicExteriorSegment(seg: WallSegment): string {
  const dash = seg.dashed ? ' stroke-dasharray="2.4 1.2"' : "";
  return (
    `<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" ` +
    `stroke="${ARCH.wallExterior}" stroke-width="${ARCH.wallExteriorWidth}" ` +
    `stroke-linecap="square" stroke-linejoin="miter"${dash}/>`
  );
}

function renderPublicInteriorSegment(seg: WallSegment): string {
  return (
    `<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" ` +
    `stroke="${ARCH.wallInterior}" stroke-width="${ARCH.wallInteriorWidth}" ` +
    `stroke-linecap="square" stroke-linejoin="miter"/>`
  );
}

function renderDebugExteriorSegment(seg: WallSegment): string {
  const dash = seg.dashed ? ' stroke-dasharray="2.2 1.4"' : "";
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.1) return "";

  const nx = (-dy / len) * STROKE.exteriorOuter;
  const ny = (dx / len) * STROKE.exteriorOuter;

  return (
    `<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" ` +
    `stroke="${EXTERIOR_DEBUG}" stroke-width="${STROKE.exterior}" stroke-linecap="square" data-wall-kind="exterior"/>` +
    `<line x1="${seg.x1 + nx}" y1="${seg.y1 + ny}" x2="${seg.x2 + nx}" y2="${seg.y2 + ny}" ` +
    `stroke="${EXTERIOR_DEBUG}" stroke-width="${STROKE.exteriorOuter}" stroke-linecap="square"${dash} data-wall-kind="exterior-candidate"/>`
  );
}

function renderDebugInteriorSegment(seg: WallSegment): string {
  return (
    `<line x1="${seg.x1}" y1="${seg.y1}" x2="${seg.x2}" y2="${seg.y2}" ` +
    `stroke="${INTERIOR}" stroke-width="${STROKE.interior}" stroke-linecap="square" data-wall-kind="interior"/>`
  );
}

function cutWallsForOpenings(
  walls: WallSegment[],
  openings: PlanOpening[],
): WallSegment[] {
  const cutWalls: WallSegment[] = [];
  for (const wall of walls) {
    let parts: WallSegment[] = [wall];
    for (const op of openings) {
      const next: WallSegment[] = [];
      for (const p of parts) {
        next.push(...splitWallForOpening(p, op.x1, op.y1, op.x2, op.y2));
      }
      parts = next.length ? next : parts;
    }
    cutWalls.push(...parts);
  }
  return cutWalls;
}

/** Public preliminary plan — thick dark architectural walls. */
export function renderArchitecturalWallLayer(
  walls: WallSegment[],
  openings: PlanOpening[],
): string {
  const cutWalls = cutWallsForOpenings(walls, openings);
  return cutWalls
    .map((seg) =>
      seg.kind === "exterior"
        ? renderPublicExteriorSegment(seg)
        : renderPublicInteriorSegment(seg),
    )
    .join("");
}

export function renderWallGraphLayer(
  walls: WallSegment[],
  openings: PlanOpening[],
): string {
  const cutWalls = cutWallsForOpenings(walls, openings);
  return cutWalls
    .map((seg) =>
      seg.kind === "exterior"
        ? renderDebugExteriorSegment(seg)
        : renderDebugInteriorSegment(seg),
    )
    .join("");
}

export function renderWallGraphDebugAnnotations(
  walls: WallSegment[],
  openings: PlanOpening[],
): string {
  const wallIds = walls
    .map((seg) => {
      const { x, y } = segmentMid(seg);
      const label = seg.debugId ?? seg.kind;
      const fill = seg.kind === "exterior" ? EXTERIOR_DEBUG : INTERIOR;
      return (
        `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" ` +
        `font-size="0.65" font-family="monospace" fill="${fill}" opacity="0.85">${label}</text>`
      );
    })
    .join("");

  const openingCuts = openings
    .map(
      (op) =>
        `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" ` +
        `stroke="${OPENING_CUT}" stroke-width="0.45" stroke-linecap="square" stroke-opacity="0.75" ` +
        `data-opening-id="${op.id}" data-opening-kind="${op.kind}"/>`,
    )
    .join("");

  return (
    `<g id="wall-graph-debug-annotations" pointer-events="none" opacity="0.9">` +
    `<g id="wall-graph-ids">${wallIds}</g>` +
    `<g id="opening-cuts">${openingCuts}</g>` +
    `</g>`
  );
}
