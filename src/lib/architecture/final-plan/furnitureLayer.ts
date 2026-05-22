import type { PlanFurniture } from "./types";

const FILL = "#E2E8F0";
const STROKE = "#94A3B8";

export function buildFurniture(
  plan: import("../generatedPlan").GeneratedPlan,
  show: boolean,
): PlanFurniture[] {
  if (!show) return [];
  return (plan.furniture ?? []).map((f) => ({
    type: f.type,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    rotation: f.rotation,
  }));
}

export function renderFurniture(items: PlanFurniture[]): string {
  return items
    .map((f) => {
      const w = f.width;
      const h = f.height;
      if (w <= 0 || h <= 0) return "";
      const cx = f.x + w / 2;
      const cy = f.y + h / 2;
      const inner = `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" fill="${FILL}" stroke="${STROKE}" stroke-width="0.06"/>`;
      if (f.rotation) {
        return `<g opacity="0.18" transform="rotate(${f.rotation} ${cx} ${cy})">${inner}</g>`;
      }
      return `<g opacity="0.18">${inner}</g>`;
    })
    .join("");
}
