import type { GeneratedPlan, RenderZone } from "../generatedPlan";
import { ARCH } from "./architecturalPalette";
import type { PlanFurniture } from "./types";

const STROKE = ARCH.furniture;
const SW = 0.12;

function zoneForFurniture(
  f: PlanFurniture,
  zones: RenderZone[],
): RenderZone | undefined {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  return zones.find(
    (z) =>
      cx >= z.x &&
      cx <= z.x + z.width &&
      cy >= z.y &&
      cy <= z.y + z.height,
  );
}

export function buildFurniture(
  plan: GeneratedPlan,
  show: boolean,
): PlanFurniture[] {
  if (!show) return [];
  return (plan.furniture ?? []).map((item) => ({
    type: item.type,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
  }));
}

function wrap(inner: string, rot: number | undefined, cx: number, cy: number): string {
  const g = rot
    ? `<g opacity="0.55" transform="rotate(${rot} ${cx} ${cy})">${inner}</g>`
    : `<g opacity="0.55">${inner}</g>`;
  return g;
}

function renderSymbol(
  f: PlanFurniture,
  zones: RenderZone[],
): string {
  const w = f.width;
  const h = f.height;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return "";
  }

  const host = zoneForFurniture(f, zones);
  if (host) {
    const minDim = Math.min(host.width, host.height);
    if (minDim < 5.5) return "";
    if (Math.min(w, h) > minDim * 0.55) return "";
  }

  const cx = f.x + w / 2;
  const cy = f.y + h / 2;

  switch (f.type) {
    case "sofa":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.35" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x + w * 0.12}" y1="${f.y + h * 0.35}" x2="${f.x + w * 0.88}" y2="${f.y + h * 0.35}" stroke="${STROKE}" stroke-width="${SW * 0.85}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "bed_double":
    case "bed_single":
      return wrap(
        `<rect x="${f.x}" y="${f.y + h * 0.18}" width="${w}" height="${h * 0.72}" rx="0.25" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<ellipse cx="${f.x + w * 0.5}" cy="${f.y + h * 0.32}" rx="${w * 0.22}" ry="${h * 0.12}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "dining_table":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.4}" ry="${h * 0.36}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<circle cx="${f.x + w * 0.25}" cy="${f.y + h * 0.25}" r="${Math.min(w, h) * 0.08}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>` +
          `<circle cx="${f.x + w * 0.75}" cy="${f.y + h * 0.25}" r="${Math.min(w, h) * 0.08}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "kitchen_counter":
      return wrap(
        `<path d="M ${f.x} ${f.y + h} L ${f.x} ${f.y + h * 0.42} L ${f.x + w * 0.58} ${f.y + 0.2} L ${f.x + w} ${f.y + 0.2} L ${f.x + w} ${f.y + h} Z" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<rect x="${f.x + w * 0.62}" y="${f.y + h * 0.35}" width="${w * 0.12}" height="${h * 0.12}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.8}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "bath_fixture":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.38}" ry="${h * 0.32}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "grill":
      return wrap(
        `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.36}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "wardrobe":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x + w * 0.33}" y1="${f.y}" x2="${f.x + w * 0.33}" y2="${f.y + h}" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
        f.rotation,
        cx,
        cy,
      );
    default:
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.2" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>`,
        f.rotation,
        cx,
        cy,
      );
  }
}

export function renderFurniture(
  items: PlanFurniture[],
  zones: RenderZone[] = [],
): string {
  return items.map((f) => renderSymbol(f, zones)).join("");
}
