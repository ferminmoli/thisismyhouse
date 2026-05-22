import { escapeXml } from "./planGeometryUtils";
import type { PlanLabel } from "./types";

import { ARCH } from "./architecturalPalette";

const INK = ARCH.ink;
const MUTED = ARCH.inkMuted;
const HALO = "#FFFFFF";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

function textAttrs(
  x: number,
  y: number,
  size: number,
  weight: string,
  fill: string,
  tracking?: string,
): string {
  const track = tracking ? ` letter-spacing="${tracking}"` : "";
  return (
    `x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" ` +
    `font-size="${size}" font-family="${FONT}" ` +
    `font-weight="${weight}" fill="${fill}" paint-order="stroke fill" ` +
    `stroke="${HALO}" stroke-width="${size * 0.32}" stroke-linejoin="round"${track}`
  );
}

export function renderRoomLabels(labels: PlanLabel[]): string {
  return labels
    .map((lb) => {
      const name = `<text ${textAttrs(lb.x, lb.nameY, lb.nameSize, "600", INK, "0.02")}>${escapeXml(lb.name)}</text>`;
      const area = lb.areaText
        ? `<text ${textAttrs(lb.x, lb.areaY, lb.areaSize, "400", MUTED)}>${escapeXml(lb.areaText)}</text>`
        : "";
      return `<g class="room-label" pointer-events="none">${name}${area}</g>`;
    })
    .join("");
}
