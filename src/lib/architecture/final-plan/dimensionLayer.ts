import { escapeXml } from "./planGeometryUtils";
import type { PlanDimension } from "./types";

const DIM_COLOR = "#6B8CAE";
const TICK = 0.35;

function tickAt(x: number, y: number, horizontal: boolean): string {
  if (horizontal) {
    return (
      `<line x1="${x - TICK}" y1="${y - TICK}" x2="${x + TICK}" y2="${y + TICK}" stroke="${DIM_COLOR}" stroke-width="0.16"/>` +
      `<line x1="${x - TICK}" y1="${y + TICK}" x2="${x + TICK}" y2="${y - TICK}" stroke="${DIM_COLOR}" stroke-width="0.16"/>`
    );
  }
  return (
    `<line x1="${x - TICK}" y1="${y - TICK}" x2="${x + TICK}" y2="${y - TICK}" stroke="${DIM_COLOR}" stroke-width="0.16"/>` +
    `<line x1="${x - TICK}" y1="${y + TICK}" x2="${x + TICK}" y2="${y + TICK}" stroke="${DIM_COLOR}" stroke-width="0.16"/>`
  );
}

function renderOne(dim: PlanDimension): string {
  const horizontal = dim.rotation === 0;
  const labelAttrs = horizontal
    ? `x="${dim.labelX}" y="${dim.labelY - 0.55}" text-anchor="middle" dominant-baseline="auto"`
    : `x="${dim.labelX - 0.45}" y="${dim.labelY}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${dim.labelX - 0.45} ${dim.labelY})"`;

  return (
    `<g class="preliminary-dimension" data-dim="${escapeXml(dim.id)}">` +
    `<line x1="${dim.ext1.x1}" y1="${dim.ext1.y1}" x2="${dim.ext1.x2}" y2="${dim.ext1.y2}" stroke="${DIM_COLOR}" stroke-width="0.14"/>` +
    `<line x1="${dim.ext2.x1}" y1="${dim.ext2.y1}" x2="${dim.ext2.x2}" y2="${dim.ext2.y2}" stroke="${DIM_COLOR}" stroke-width="0.14"/>` +
    `<line x1="${dim.x1}" y1="${dim.y1}" x2="${dim.x2}" y2="${dim.y2}" stroke="${DIM_COLOR}" stroke-width="0.2"/>` +
    tickAt(dim.x1, dim.y1, horizontal) +
    tickAt(dim.x2, dim.y2, horizontal) +
    `<text ${labelAttrs} font-size="0.95" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-weight="500" fill="${DIM_COLOR}">${escapeXml(dim.label)}</text>` +
    `</g>`
  );
}

/** Optional public dimension layer — estimated, non construction-grade. */
export function renderPreliminaryDimensions(dimensions: PlanDimension[]): string {
  if (!dimensions.length) return "";
  return (
    `<g id="preliminary-dimensions" pointer-events="none" opacity="0.92">` +
    dimensions.map(renderOne).join("") +
    `</g>`
  );
}
