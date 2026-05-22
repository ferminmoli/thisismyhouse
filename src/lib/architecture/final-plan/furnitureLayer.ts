import type { PlanRoom } from "./types";
import { buildFurnitureWithFallback } from "./furnitureFallback";
import type { GeneratedPlan, RenderZone } from "../generatedPlan";
import { ARCH } from "./architecturalPalette";
import type { PlanFurniture } from "./types";

export { buildFurnitureWithFallback };

const STROKE = ARCH.furniture;
const SW = 0.1;
const O = 0.48;

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

/** @deprecated Use buildFurnitureWithFallback */
export function buildFurniture(
  plan: GeneratedPlan,
  show: boolean,
  rooms: PlanRoom[] = [],
): PlanFurniture[] {
  return buildFurnitureWithFallback(plan, rooms, show);
}

function wrap(
  inner: string,
  rot: number | undefined,
  cx: number,
  cy: number,
): string {
  return rot
    ? `<g opacity="${O}" transform="rotate(${rot} ${cx} ${cy})">${inner}</g>`
    : `<g opacity="${O}">${inner}</g>`;
}

function renderSymbol(f: PlanFurniture, zones: RenderZone[]): string {
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
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.3" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x + w * 0.08}" y1="${f.y + h * 0.42}" x2="${f.x + w * 0.92}" y2="${f.y + h * 0.42}" stroke="${STROKE}" stroke-width="${SW * 0.8}"/>` +
          `<line x1="${f.x + w * 0.08}" y1="${f.y + h * 0.58}" x2="${f.x + w * 0.92}" y2="${f.y + h * 0.58}" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<line x1="${f.x + w * 0.06}" y1="${f.y + h * 0.2}" x2="${f.x + w * 0.06}" y2="${f.y + h * 0.8}" stroke="${STROKE}" stroke-width="${SW * 0.85}"/>` +
          `<line x1="${f.x + w * 0.94}" y1="${f.y + h * 0.2}" x2="${f.x + w * 0.94}" y2="${f.y + h * 0.8}" stroke="${STROKE}" stroke-width="${SW * 0.85}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "bed_double": {
      const night = w >= 9;
      return wrap(
        `<rect x="${f.x}" y="${f.y + h * 0.2}" width="${w}" height="${h * 0.68}" rx="0.2" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<ellipse cx="${f.x + w * 0.32}" cy="${f.y + h * 0.32}" rx="${w * 0.1}" ry="${h * 0.09}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<ellipse cx="${f.x + w * 0.68}" cy="${f.y + h * 0.32}" rx="${w * 0.1}" ry="${h * 0.09}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<line x1="${f.x + w * 0.12}" y1="${f.y + h * 0.48}" x2="${f.x + w * 0.88}" y2="${f.y + h * 0.48}" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>` +
          (night
            ? `<rect x="${f.x + w * 0.02}" y="${f.y + h * 0.35}" width="${w * 0.1}" height="${h * 0.22}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
              `<rect x="${f.x + w * 0.88}" y="${f.y + h * 0.35}" width="${w * 0.1}" height="${h * 0.22}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>`
            : ""),
        f.rotation,
        cx,
        cy,
      );
    }
    case "bed_single":
      return wrap(
        `<rect x="${f.x}" y="${f.y + h * 0.2}" width="${w}" height="${h * 0.68}" rx="0.2" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<ellipse cx="${f.x + w * 0.5}" cy="${f.y + h * 0.32}" rx="${w * 0.16}" ry="${h * 0.1}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<line x1="${f.x + w * 0.15}" y1="${f.y + h * 0.5}" x2="${f.x + w * 0.85}" y2="${f.y + h * 0.5}" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "dining_table": {
      const tw = w * 0.55;
      const th = h * 0.38;
      const tx = cx - tw / 2;
      const ty = cy - th / 2;
      const cr = Math.min(w, h) * 0.06;
      return wrap(
        `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<circle cx="${tx - cr}" cy="${ty - cr}" r="${cr}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<circle cx="${tx + tw + cr}" cy="${ty - cr}" r="${cr}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<circle cx="${tx - cr}" cy="${ty + th + cr}" r="${cr}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<circle cx="${tx + tw + cr}" cy="${ty + th + cr}" r="${cr}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>`,
        f.rotation,
        cx,
        cy,
      );
    }
    case "coffee_table":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.42}" ry="${h * 0.38}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.9}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "kitchen_counter":
      return wrap(
        `<path d="M ${f.x} ${f.y + h} L ${f.x} ${f.y + h * 0.4} L ${f.x + w * 0.62} ${f.y + 0.18} L ${f.x + w} ${f.y + 0.18} L ${f.x + w} ${f.y + h} Z" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x + w * 0.08}" y1="${f.y + h * 0.55}" x2="${f.x + w * 0.55}" y2="${f.y + h * 0.55}" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "sink":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.42}" ry="${h * 0.4}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.08}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.8}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "cooktop":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.12" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<circle cx="${f.x + w * 0.35}" cy="${cy}" r="${Math.min(w, h) * 0.12}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>` +
          `<circle cx="${f.x + w * 0.65}" cy="${cy}" r="${Math.min(w, h) * 0.12}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.75}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "fridge":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x}" y1="${f.y + h * 0.35}" x2="${f.x + w}" y2="${f.y + h * 0.35}" stroke="${STROKE}" stroke-width="${SW * 0.8}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "toilet":
      return wrap(
        `<ellipse cx="${cx}" cy="${f.y + h * 0.62}" rx="${w * 0.38}" ry="${h * 0.28}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<rect x="${f.x + w * 0.28}" y="${f.y}" width="${w * 0.44}" height="${h * 0.42}" rx="0.1" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.9}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "shower":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x}" y1="${f.y}" x2="${f.x + w}" y2="${f.y + h}" stroke="${STROKE}" stroke-width="${SW * 0.65}" stroke-dasharray="0.4 0.35"/>` +
          `<circle cx="${f.x + w * 0.78}" cy="${f.y + h * 0.22}" r="${Math.min(w, h) * 0.08}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "washing_machine":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.15" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.28}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.85}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "plant":
      return wrap(
        `<circle cx="${cx}" cy="${cy + h * 0.08}" r="${Math.min(w, h) * 0.28}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.85}"/>` +
          `<line x1="${cx}" y1="${cy + h * 0.2}" x2="${cx}" y2="${f.y + h * 0.05}" stroke="${STROKE}" stroke-width="${SW}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "outdoor_table":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.35}" ry="${h * 0.3}" fill="none" stroke="${STROKE}" stroke-width="${SW * 0.85}" opacity="0.7"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "bath_fixture":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.36}" ry="${h * 0.3}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>`,
        f.rotation,
        cx,
        cy,
      );
    case "grill":
      return wrap(
        `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.34}" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>` +
          `<line x1="${f.x + w * 0.2}" y1="${cy}" x2="${f.x + w * 0.8}" y2="${cy}" stroke="${STROKE}" stroke-width="${SW * 0.7}"/>`,
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
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.15" fill="none" stroke="${STROKE}" stroke-width="${SW}"/>`,
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
