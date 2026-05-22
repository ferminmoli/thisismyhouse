import type {
  FurnitureHint,
  GeneratedPlan,
  RenderDoor,
  RenderWindow,
  RenderZone,
} from "./generatedPlan";
import { NORMALIZED_CANVAS } from "./planMetadata";
import { enclosureOfZone, isOutdoorSpace, isSemiOutdoorSpace } from "./spaceClassification";
import type { SvgLegendItem, SvgPlanRender } from "./floorPlanPipelineTypes";

const PLAN_W = NORMALIZED_CANVAS.width;
const PLAN_H = NORMALIZED_CANVAS.height;

/** Vertical layout: caption → plan (inset) → compact legend */
const LAYOUT = {
  padX: 2,
  captionH: 4.2,
  legendH: 8,
  gap: 1.4,
  planInset: 3.5,
  planScale: 0.92,
} as const;

const VIEW_W = 100;
const VIEW_H =
  LAYOUT.captionH + LAYOUT.gap + PLAN_H + LAYOUT.gap + LAYOUT.legendH;

const PLAN_ORIGIN_Y = LAYOUT.captionH + LAYOUT.gap;

export type NormalizedPlanInput = {
  variantId: string;
  variantLabel: string;
  plan: GeneratedPlan;
  title?: string;
};

export type RenderPlanSvgParams = NormalizedPlanInput;

const VIEW_BOX = `0 0 ${VIEW_W} ${VIEW_H}`;

export const PUBLIC_SVG_CAPTION =
  "Planta conceptual · no es plano de obra";

export const PUBLIC_SVG_DISCLAIMER =
  "Planta conceptual generada a partir del programa. No reemplaza documentación técnica ni proyecto ejecutivo.";

const PALETTE = {
  pageBg: "#F6F4F0",
  planBg: "#FDFCF9",
  frameStroke: "#DDD8CE",
  perimeter: "#8A8278",
  social: { fill: "#FAF6F0", stroke: "#D8CDB8" },
  private: { fill: "#F4F0F7", stroke: "#C4B6D0" },
  service: { fill: "#EEF4F9", stroke: "#9EB4C8" },
  circulation: { fill: "#F5F5F3", stroke: "#C8C8C0" },
  work: { fill: "#EFF4F1", stroke: "#A8B8B0" },
  flex: { fill: "#F7F5F1", stroke: "#C9C0B4" },
  outdoor: { fill: "#E8F2E8", stroke: "#6E9A6E" },
  semi_outdoor: { fill: "#EDF4EE", stroke: "#7AA088" },
  furnitureFill: "#B8AEA0",
  furnitureStroke: "#9A9088",
  door: "#6E5E52",
  doorSliding: "#8A7A6E",
  passage: "#7A6E64",
  window: "#3D6F9E",
  windowGlass: "#A8C8E0",
  text: "#35322E",
  textMuted: "#7A746C",
} as const;

const LABEL_ALIASES: Record<string, string> = {
  SALA_COMEDOR: "Estar / comedor",
  LIVING: "Estar / comedor",
  DORMITORIO_PRINCIPAL: "Dormitorio principal",
  DORMITORIO_1: "Dormitorio 1",
  DORMITORIO_2: "Dormitorio 2",
  DORMITORIO_3: "Dormitorio 3",
  BANIO: "Baño",
  BAÑO: "Baño",
  BANO: "Baño",
  BATH: "Baño",
  DISTRIBUIDOR: "Distrib.",
  LAVADERO: "Lavadero",
  LAUNDRY: "Lavadero",
  PATIO: "Patio",
  COCINA: "Cocina",
  KITCHEN: "Cocina",
  ACCESO: "Acceso",
  GALERIA: "Galería",
  GALLERY: "Galería",
  ENTRADA: "Acceso",
  HALL: "Distrib.",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function norm(id: string): string {
  return id.trim().toUpperCase();
}

/** Exported for tests */
export function humanizeZoneLabel(zone: RenderZone): string {
  const rawId = norm(zone.sourceRoomId).replace(/^ZONE_/, "");
  if (LABEL_ALIASES[rawId]) return LABEL_ALIASES[rawId];

  if (rawId === "DORMITORIO_PRINCIPAL" || /DORMITORIO.*PRINCIPAL/i.test(rawId)) {
    return "Dormitorio principal";
  }
  const dormMatch = rawId.match(/^DORMITORIO[_\s]?(\d+)$/i);
  if (dormMatch) {
    return `Dormitorio ${dormMatch[1]}`;
  }

  if (isSemiOutdoorSpace(zone.type)) {
    if (/galer/i.test(zone.label) || /galer/i.test(rawId)) return "Galería";
    return zone.label?.trim() || "Semi-cubierto";
  }

  if (/lavadero|laundry/i.test(zone.label) || /LAVADERO|LAUNDRY/i.test(rawId)) {
    return "Lavadero";
  }

  const fromLabel = zone.label?.trim();
  if (fromLabel && !/^zone[_\s]/i.test(fromLabel) && fromLabel.length < 28) {
    return fromLabel;
  }

  return rawId
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function findZone(zones: RenderZone[], roomOrZoneId: string): RenderZone | undefined {
  const key = norm(roomOrZoneId);
  return zones.find(
    (z) =>
      norm(z.sourceRoomId) === key ||
      norm(z.id) === key ||
      norm(z.id) === `ZONE_${key}`,
  );
}

function zoneStyle(zone: RenderZone): {
  fill: string;
  stroke: string;
  pattern?: string;
  strokeWidth: number;
} {
  const enc = enclosureOfZone(zone);
  if (enc === "outdoor") {
    return {
      fill: PALETTE.outdoor.fill,
      stroke: PALETTE.outdoor.stroke,
      pattern: "pat-outdoor",
      strokeWidth: 0.42,
    };
  }
  if (enc === "semi_covered") {
    return {
      fill: PALETTE.semi_outdoor.fill,
      stroke: PALETTE.semi_outdoor.stroke,
      pattern: "pat-semi",
      strokeWidth: 0.34,
    };
  }
  const key = zone.type as keyof typeof PALETTE;
  const p =
    key === "social" ||
    key === "private" ||
    key === "service" ||
    key === "circulation"
      ? PALETTE[key]
      : PALETTE.flex;
  return { fill: p.fill, stroke: p.stroke, strokeWidth: 0.24 };
}

function zoneRoomKeys(zone: RenderZone): string[] {
  const keys = new Set<string>();
  const add = (s: string) => {
    const n = norm(s).replace(/^ZONE_/, "");
    if (n) keys.add(n);
  };
  add(zone.sourceRoomId);
  add(zone.id);
  add(zone.label);
  return [...keys];
}

function zoneAreaM2(plan: GeneratedPlan, zone: RenderZone): number | null {
  const keys = zoneRoomKeys(zone);
  const estimates = plan.metadata.areaEstimate?.zoneAreaEstimates;
  if (estimates?.length) {
    const match = estimates.find((e) => {
      const rid = norm(e.roomId).replace(/^ZONE_/, "");
      return keys.some((k) => k === rid || k === norm(e.roomId));
    });
    if (match?.estimatedAreaM2 != null) return match.estimatedAreaM2;
  }
  return null;
}

function sortZonesForPaint(zones: RenderZone[]): RenderZone[] {
  const order = { covered: 0, semi_covered: 1, outdoor: 2 };
  return [...zones].sort(
    (a, b) =>
      order[enclosureOfZone(a)] - order[enclosureOfZone(b)] ||
      a.y - b.y ||
      a.x - b.x,
  );
}

function coveredBoundingBox(zones: RenderZone[]): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  const covered = zones.filter((z) => enclosureOfZone(z) === "covered");
  if (!covered.length) return null;
  const x1 = Math.min(...covered.map((z) => z.x));
  const y1 = Math.min(...covered.map((z) => z.y));
  const x2 = Math.max(...covered.map((z) => z.x + z.width));
  const y2 = Math.max(...covered.map((z) => z.y + z.height));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function buildDefs(): string {
  return `<defs>
  <pattern id="pat-outdoor" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <line x1="0" y1="0" x2="0" y2="3" stroke="${PALETTE.outdoor.stroke}" stroke-width="0.16" stroke-opacity="0.18"/>
  </pattern>
  <pattern id="pat-semi" width="3.5" height="3.5" patternUnits="userSpaceOnUse">
    <path d="M0 3.5 L3.5 0" stroke="${PALETTE.semi_outdoor.stroke}" stroke-width="0.14" stroke-opacity="0.22"/>
  </pattern>
  <filter id="plan-shadow" x="-6%" y="-6%" width="112%" height="112%">
    <feDropShadow dx="0" dy="0.35" stdDeviation="0.65" flood-color="#3A3630" flood-opacity="0.07"/>
  </filter>
</defs>`;
}

function labelTextAttrs(
  x: number,
  y: number,
  size: number,
  weight: "500" | "400",
  fill: string,
): string {
  return (
    `x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" ` +
    `font-size="${size}" font-family="ui-sans-serif,system-ui,-apple-system,sans-serif" ` +
    `font-weight="${weight}" fill="${fill}" paint-order="stroke fill" ` +
    `stroke="${PALETTE.planBg}" stroke-width="${size * 0.22}" stroke-linejoin="round"`
  );
}

function renderZoneShape(zone: RenderZone): string {
  const style = zoneStyle(zone);
  const enc = enclosureOfZone(zone);
  const dash = enc === "semi_covered" ? ' stroke-dasharray="1.4 0.9"' : "";
  const pattern = style.pattern
    ? ` fill="url(#${style.pattern})"`
    : ` fill="${style.fill}"`;
  const rx =
    enc === "outdoor" ? 0.9 : enc === "semi_covered" ? 0.55 : 0.38;
  return (
    `<rect x="${zone.x}" y="${zone.y}" width="${zone.width}" height="${zone.height}"` +
    `${pattern} stroke="${style.stroke}" stroke-width="${style.strokeWidth}"${dash} rx="${rx}"/>`
  );
}

function renderZoneLabel(plan: GeneratedPlan, zone: RenderZone): string {
  const name = humanizeZoneLabel(zone);
  const m2 = zoneAreaM2(plan, zone);
  const minDim = Math.min(zone.width, zone.height);
  if (minDim < 2.8) return "";

  const cx = zone.x + zone.width / 2;
  const cy = zone.y + zone.height / 2;
  const compact = minDim < 4.2;
  const nameSize = compact
    ? Math.max(1.15, Math.min(1.65, minDim * 0.38))
    : Math.max(1.3, Math.min(2.35, minDim * 0.17));
  const subSize = Math.max(0.95, Math.min(1.55, nameSize * 0.7));
  const showM2 = m2 != null && minDim >= 6.2 && !compact;

  const nameY = cy - (showM2 ? 0.65 : 0);
  const nameLine = `<text ${labelTextAttrs(cx, nameY, nameSize, "500", PALETTE.text)}>${escapeXml(name)}</text>`;
  const m2Line = showM2
    ? `<text ${labelTextAttrs(cx, cy + 1, subSize, "400", PALETTE.textMuted)}>${Math.round(m2)} m²</text>`
    : "";
  return `<g class="zone-label" pointer-events="none">${nameLine}${m2Line}</g>`;
}

function renderBuildingPerimeter(zones: RenderZone[]): string {
  const box = coveredBoundingBox(zones);
  if (!box || box.w < 2 || box.h < 2) return "";
  const pad = 0.15;
  return (
    `<rect x="${box.x - pad}" y="${box.y - pad}" width="${box.w + pad * 2}" height="${box.h + pad * 2}" ` +
    `fill="none" stroke="${PALETTE.perimeter}" stroke-width="0.5" rx="0.6" stroke-opacity="0.85"/>`
  );
}

function wallOpeningCoords(
  zone: RenderZone,
  wall: RenderDoor["wall"],
  position: number,
  span: number,
): { x1: number; y1: number; x2: number; y2: number; cx: number; cy: number } {
  const t = Math.max(0.08, Math.min(0.92, position / 100));
  const half = span / 2;
  let cx = zone.x + zone.width * t;
  let cy = zone.y + zone.height * t;

  if (wall === "top") {
    cy = zone.y;
    return { cx, cy, x1: cx - half, y1: cy, x2: cx + half, y2: cy };
  }
  if (wall === "bottom") {
    cy = zone.y + zone.height;
    return { cx, cy, x1: cx - half, y1: cy, x2: cx + half, y2: cy };
  }
  if (wall === "left") {
    cx = zone.x;
    return { cx, cy, x1: cx, y1: cy - half, x2: cx, y2: cy + half };
  }
  cx = zone.x + zone.width;
  return { cx, cy, x1: cx, y1: cy - half, x2: cx, y2: cy + half };
}

function renderDoorGap(
  zone: RenderZone,
  wall: RenderDoor["wall"],
  position: number,
  span: number,
): string {
  const { x1, y1, x2, y2 } = wallOpeningCoords(zone, wall, position, span);
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.planBg}" stroke-width="1.2" stroke-linecap="round"/>`;
}

function isPatioOpening(door: RenderDoor, zones: RenderZone[]): boolean {
  const a = findZone(zones, door.from);
  const b = findZone(zones, door.to);
  return Boolean(
    (a && isOutdoorSpace(a.type)) || (b && isOutdoorSpace(b.type)),
  );
}

function renderDoorSymbol(
  door: RenderDoor,
  zone: RenderZone,
  zones: RenderZone[],
): string | null {
  const patio = isPatioOpening(door, zones);
  const span = Math.max(
    1.2,
    Math.min(patio ? 9 : 5, door.width * (patio ? 0.3 : 0.2)),
  );
  const { cx, cy, x1, y1, x2, y2 } = wallOpeningCoords(
    zone,
    door.wall,
    door.position,
    span,
  );

  if (door.type === "open_passage") {
    return (
      `<g>` +
      renderDoorGap(zone, door.wall, door.position, span) +
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.passage}" stroke-width="0.42" stroke-linecap="round" stroke-opacity="0.75"/>` +
      `</g>`
    );
  }

  if (door.type === "sliding" || patio) {
    const trackOffset = 0.35;
    const track =
      door.wall === "left" || door.wall === "right"
        ? `<line x1="${cx - trackOffset}" y1="${y1}" x2="${cx - trackOffset}" y2="${y2}" stroke="${PALETTE.doorSliding}" stroke-width="0.24" stroke-opacity="0.7"/>`
        : `<line x1="${x1}" y1="${cy - trackOffset}" x2="${x2}" y2="${cy - trackOffset}" stroke="${PALETTE.doorSliding}" stroke-width="0.24" stroke-opacity="0.7"/>`;
    return (
      `<g>` +
      renderDoorGap(zone, door.wall, door.position, span) +
      track +
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${PALETTE.doorSliding}" stroke-width="${patio ? 0.58 : 0.46}" stroke-linecap="round"/>` +
      `</g>`
    );
  }

  const r = Math.min(span * 0.75, span);
  let hingeX = x1;
  let hingeY = y1;
  let leafX = x1;
  let leafY = y1;
  let arcD = "";

  switch (door.wall) {
    case "bottom":
      leafY = cy - r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 0 ${hingeX} ${leafY}`;
      break;
    case "top":
      leafY = cy + r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 1 ${hingeX} ${leafY}`;
      break;
    case "right":
      hingeX = cx;
      hingeY = y2;
      leafX = cx - r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 1 ${leafX} ${hingeY}`;
      break;
    case "left":
      hingeX = cx;
      hingeY = y2;
      leafX = cx + r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 0 ${leafX} ${hingeY}`;
      break;
  }

  return (
    `<g>` +
    renderDoorGap(zone, door.wall, door.position, span) +
    `<line x1="${hingeX}" y1="${hingeY}" x2="${leafX}" y2="${leafY}" stroke="${PALETTE.door}" stroke-width="0.32" stroke-linecap="round"/>` +
    `<path d="${arcD}" fill="none" stroke="${PALETTE.door}" stroke-width="0.18" stroke-dasharray="0.45 0.4" stroke-opacity="0.55"/>` +
    `</g>`
  );
}

function renderDoor(door: RenderDoor, zones: RenderZone[]): string | null {
  const zone = findZone(zones, door.from) ?? findZone(zones, door.to);
  if (!zone) return null;
  return renderDoorSymbol(door, zone, zones);
}

function windowLength(size: RenderWindow["size"], base: number): number {
  const mult = size === "large" ? 1.45 : size === "medium" ? 1.1 : 0.9;
  return Math.max(1.3, base * 0.14 * mult);
}

function renderWindow(win: RenderWindow, zones: RenderZone[]): string | null {
  const zone = findZone(zones, win.zoneId);
  if (!zone) return null;

  const len = windowLength(win.size, win.width);
  const t = Math.max(0.08, Math.min(0.92, win.position / 100));
  const inset = 0.2;
  const gap = 0.22;
  let outer = { x1: 0, y1: 0, x2: 0, y2: 0 };
  let inner = { x1: 0, y1: 0, x2: 0, y2: 0 };

  if (win.wall === "top") {
    const y = zone.y + inset;
    outer.x1 = zone.x + zone.width * t - len / 2;
    outer.x2 = outer.x1 + len;
    outer.y1 = outer.y2 = y;
    inner.y1 = inner.y2 = y + gap;
    inner.x1 = outer.x1;
    inner.x2 = outer.x2;
  } else if (win.wall === "bottom") {
    const y = zone.y + zone.height - inset;
    outer.x1 = zone.x + zone.width * t - len / 2;
    outer.x2 = outer.x1 + len;
    outer.y1 = outer.y2 = y;
    inner.y1 = inner.y2 = y - gap;
    inner.x1 = outer.x1;
    inner.x2 = outer.x2;
  } else if (win.wall === "left") {
    const x = zone.x + inset;
    outer.y1 = zone.y + zone.height * t - len / 2;
    outer.y2 = outer.y1 + len;
    outer.x1 = outer.x2 = x;
    inner.x1 = inner.x2 = x + gap;
    inner.y1 = outer.y1;
    inner.y2 = outer.y2;
  } else {
    const x = zone.x + zone.width - inset;
    outer.y1 = zone.y + zone.height * t - len / 2;
    outer.y2 = outer.y1 + len;
    outer.x1 = outer.x2 = x;
    inner.x1 = inner.x2 = x - gap;
    inner.y1 = outer.y1;
    inner.y2 = outer.y2;
  }

  return (
    `<g pointer-events="none">` +
    `<line x1="${outer.x1}" y1="${outer.y1}" x2="${outer.x2}" y2="${outer.y2}" stroke="${PALETTE.window}" stroke-width="0.48" stroke-linecap="round"/>` +
    `<line x1="${inner.x1}" y1="${inner.y1}" x2="${inner.x2}" y2="${inner.y2}" stroke="${PALETTE.windowGlass}" stroke-width="0.28" stroke-linecap="round"/>` +
    `</g>`
  );
}

function zoneForFurniture(
  f: FurnitureHint,
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

function renderFurniture(f: FurnitureHint, zones: RenderZone[]): string {
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

  const fill = PALETTE.furnitureFill;
  const stroke = PALETTE.furnitureStroke;
  const opacity = 0.26;
  const rot = f.rotation ?? 0;
  const cx = f.x + w / 2;
  const cy = f.y + h / 2;
  const wrap = (inner: string) =>
    rot
      ? `<g opacity="${opacity}" transform="rotate(${rot} ${cx} ${cy})">${inner}</g>`
      : `<g opacity="${opacity}">${inner}</g>`;

  switch (f.type) {
    case "sofa":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.4" fill="${fill}" stroke="${stroke}" stroke-width="0.08"/>`,
      );
    case "bed_double":
    case "bed_single":
      return wrap(
        `<rect x="${f.x}" y="${f.y + h * 0.2}" width="${w}" height="${h * 0.75}" rx="0.3" fill="${fill}" stroke="${stroke}" stroke-width="0.08"/>`,
      );
    case "dining_table":
      return wrap(
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.42}" ry="${h * 0.38}" fill="${fill}" stroke="${stroke}" stroke-width="0.08"/>`,
      );
    case "kitchen_counter":
      return wrap(
        `<path d="M ${f.x} ${f.y + h} L ${f.x} ${f.y + h * 0.4} L ${f.x + w * 0.6} ${f.y + 0.18} L ${f.x + w} ${f.y + 0.18} L ${f.x + w} ${f.y + h} Z" fill="${fill}" stroke="${stroke}" stroke-width="0.08"/>`,
      );
    case "bath_fixture":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.25" fill="${fill}" stroke="${stroke}" stroke-width="0.06"/>`,
      );
    case "grill":
      return wrap(
        `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.38}" fill="${fill}" stroke="${stroke}" stroke-width="0.08"/>`,
      );
    case "wardrobe":
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="0.06"/>`,
      );
    default:
      return wrap(
        `<rect x="${f.x}" y="${f.y}" width="${w}" height="${h}" rx="0.2" fill="${fill}" stroke="${stroke}" stroke-width="0.06"/>`,
      );
  }
}

const LEGEND_CATALOG: Array<{
  key: string;
  label: string;
  color: string;
  match: (zone: RenderZone) => boolean;
}> = [
  {
    key: "social",
    label: "Social",
    color: PALETTE.social.fill,
    match: (z) =>
      enclosureOfZone(z) === "covered" && z.type === "social",
  },
  {
    key: "private",
    label: "Privado",
    color: PALETTE.private.fill,
    match: (z) =>
      enclosureOfZone(z) === "covered" && z.type === "private",
  },
  {
    key: "service",
    label: "Servicio",
    color: PALETTE.service.fill,
    match: (z) =>
      enclosureOfZone(z) === "covered" && z.type === "service",
  },
  {
    key: "circulation",
    label: "Circulación",
    color: PALETTE.circulation.fill,
    match: (z) =>
      enclosureOfZone(z) === "covered" && z.type === "circulation",
  },
  {
    key: "outdoor",
    label: "Exterior",
    color: PALETTE.outdoor.fill,
    match: (z) => enclosureOfZone(z) === "outdoor",
  },
  {
    key: "semi",
    label: "Semi-cubierto",
    color: PALETTE.semi_outdoor.fill,
    match: (z) => enclosureOfZone(z) === "semi_covered",
  },
];

/** Legend entries only for zone types present in the plan. */
export function buildLegendFromPlan(zones: RenderZone[]): SvgLegendItem[] {
  return LEGEND_CATALOG.filter((item) => zones.some(item.match)).map(
    ({ key, label, color }) => ({ key, label, color }),
  );
}

function renderCaption(): string {
  return (
    `<g id="plan-caption" pointer-events="none">` +
    `<text x="50" y="2.8" text-anchor="middle" font-size="1.5" font-family="ui-sans-serif,system-ui,sans-serif" fill="${PALETTE.textMuted}">${escapeXml(PUBLIC_SVG_CAPTION)}</text>` +
    `</g>`
  );
}

function renderLegendRow(items: SvgLegendItem[], baseY: number): string {
  if (!items.length) return "";
  const swatch = 1.5;
  const gap = 1.2;
  const rowW = items.reduce(
    (w, item) => w + swatch + gap + item.label.length * 0.55,
    0,
  );
  let x = Math.max(4, (VIEW_W - rowW) / 2);
  const cells = items
    .map((item) => {
      const cell = (
        `<g transform="translate(${x}, ${baseY})">` +
        `<rect x="0" y="0.15" width="${swatch}" height="${swatch}" rx="0.2" fill="${item.color}" stroke="${PALETTE.frameStroke}" stroke-width="0.05"/>` +
        `<text x="${swatch + 0.65}" y="1.25" font-size="1.05" font-family="ui-sans-serif,system-ui,sans-serif" fill="${PALETTE.textMuted}">${escapeXml(item.label)}</text>` +
        `</g>`
      );
      x += swatch + gap + item.label.length * 0.55 + 1.5;
      return cell;
    })
    .join("");
  return `<g id="legend" pointer-events="none">${cells}</g>`;
}

function renderPlanCanvas(plan: GeneratedPlan): string {
  const zones = sortZonesForPaint(plan.zones);
  const zoneShapes = zones.map((z) => renderZoneShape(z)).join("");
  const labels = zones.map((z) => renderZoneLabel(plan, z)).filter(Boolean).join("\n");
  const perimeter = renderBuildingPerimeter(zones);
  const furniture = (plan.furniture ?? [])
    .map((f) => renderFurniture(f, plan.zones))
    .filter(Boolean)
    .join("\n");
  const doors = (plan.doors ?? [])
    .map((d) => renderDoor(d, plan.zones))
    .filter(Boolean)
    .join("\n");
  const windows = (plan.windows ?? [])
    .map((w) => renderWindow(w, plan.zones))
    .filter(Boolean)
    .join("\n");

  const ox = LAYOUT.padX;
  const oy = PLAN_ORIGIN_Y;
  const s = LAYOUT.planScale;
  const inset = LAYOUT.planInset;
  const innerTransform = `translate(${inset}, ${inset}) scale(${s})`;

  return (
    `<g id="plan-drawing" transform="translate(${ox}, ${oy})">` +
    `<rect x="0" y="0" width="${PLAN_W}" height="${PLAN_H}" rx="1" fill="${PALETTE.planBg}" stroke="${PALETTE.frameStroke}" stroke-width="0.18" filter="url(#plan-shadow)"/>` +
    `<g transform="${innerTransform}">` +
    `<g id="zones" pointer-events="none">${zoneShapes}</g>` +
    `<g id="perimeter" pointer-events="none">${perimeter}</g>` +
    `<g id="furniture" pointer-events="none">${furniture}</g>` +
    `<g id="doors" pointer-events="none">${doors}</g>` +
    `<g id="windows" pointer-events="none">${windows}</g>` +
    `<g id="labels" pointer-events="none">${labels}</g>` +
    `</g></g>`
  );
}

export function renderPlanToSvg(params: RenderPlanSvgParams): SvgPlanRender {
  const { plan, variantId, variantLabel } = params;
  const title = params.title ?? plan.title;
  const legend = buildLegendFromPlan(plan.zones);
  const legendY = PLAN_ORIGIN_Y + PLAN_H + LAYOUT.gap + 0.5;
  const warnings: string[] = [
    "Plano conceptual en coordenadas normalizadas (no es documento de obra).",
    ...(plan.metadata.warnings ?? []),
  ];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeXml(title)} — ${escapeXml(variantLabel)}">` +
    `<title>${escapeXml(title)} — ${escapeXml(variantLabel)}</title>` +
    `<desc>${escapeXml(PUBLIC_SVG_CAPTION)}</desc>` +
    buildDefs() +
    `<rect width="${VIEW_W}" height="${VIEW_H}" fill="${PALETTE.pageBg}"/>` +
    renderCaption() +
    renderPlanCanvas(plan) +
    (legend.length ? renderLegendRow(legend, legendY) : "") +
    `</svg>`;

  return {
    variantId,
    variantLabel,
    svg,
    viewBox: VIEW_BOX,
    coordinateSystem: "normalized_canvas",
    legend,
    warnings,
  };
}

export function renderVariantsToSvg(
  variants: Array<{ mutationType: string; label: string; plan: GeneratedPlan }>,
): SvgPlanRender[] {
  return variants.map((v) =>
    renderPlanToSvg({
      variantId: v.mutationType,
      variantLabel: v.label,
      plan: v.plan,
      title: v.plan.title,
    }),
  );
}

/** Exported for tests */
export const PREMIUM_SVG_LAYOUT = LAYOUT;
